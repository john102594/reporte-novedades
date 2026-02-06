'use server';

import { getSession } from '@/app/actions/auth';
import prisma from '@/lib/prisma';

// ============================================
// TYPES
// ============================================

export interface PolicyContext {
  user: {
    id: string;
    role: string;
    areaIds: string[];
    areas: { id: string; name: string }[];
  };
  resource?: {
    type: string;
    areaId?: string;
    status?: string;
    createdById?: string;
  };
  action: string;
}

export interface PolicyResult {
  allowed: boolean;
  reason?: string;
}

export interface RBACContext {
  userId: string;
  role: string;
  isAdmin: boolean;
  allowedAreaIds: string[] | null; // null = full access (ADMIN)
  allowedAreas: { id: string; name: string }[];
}

// ============================================
// CONTEXT BUILDER
// ============================================

export async function getRBACContext(): Promise<RBACContext | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { 
      managedAreas: { select: { id: true, name: true } }, 
      coordinatedAreas: { select: { id: true, name: true } } 
    }
  });

  if (!user) return null;

  const isAdmin = user.role === 'ADMIN';
  
  // Combine managed + coordinated areas (remove duplicates)
  const areaMap = new Map<string, { id: string; name: string }>();
  [...user.managedAreas, ...user.coordinatedAreas].forEach(a => areaMap.set(a.id, a));
  const allowedAreas = Array.from(areaMap.values());

  return {
    userId: user.id,
    role: user.role,
    isAdmin,
    allowedAreaIds: isAdmin ? null : allowedAreas.map(a => a.id),
    allowedAreas
  };
}

export async function buildPolicyContext(
  action: string,
  resource?: { type: string; areaId?: string; status?: string; createdById?: string }
): Promise<PolicyContext | null> {
  const ctx = await getRBACContext();
  if (!ctx) return null;

  return {
    user: { 
      id: ctx.userId, 
      role: ctx.role, 
      areaIds: ctx.allowedAreaIds || [],
      areas: ctx.allowedAreas
    },
    resource,
    action
  };
}

// ============================================
// POLICY EVALUATOR
// ============================================

export async function evaluatePolicy(ctx: PolicyContext): Promise<PolicyResult> {
  const { user, resource, action } = ctx;

  // ADMIN bypasses all checks
  if (user.role === 'ADMIN') {
    return { allowed: true };
  }

  // RBAC: Check role permissions
  const roleAllowed = checkRolePermission(user.role, action);
  if (!roleAllowed.allowed) {
    return roleAllowed;
  }

  // ABAC: Check area isolation
  if (resource?.areaId) {
    if (!user.areaIds.includes(resource.areaId)) {
      return { allowed: false, reason: 'No tienes acceso a esta área.' };
    }
  }

  // ABAC: Check state transitions
  if (resource?.type && resource?.status) {
    const stateAllowed = checkStatePermission(action, resource.type, resource.status);
    if (!stateAllowed.allowed) {
      return stateAllowed;
    }
  }

  return { allowed: true };
}

// ============================================
// RBAC: ROLE → ACTION PERMISSIONS
// ============================================

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ['*'], // All actions
  MANAGER: [
    // Reports
    'view:report', 'approve:report', 'reject:report',
    // Tasks
    'view:task', 'analyze:task', 'approve:plan', 'reject:plan', 'revoke:plan',
    // Masters - Machines
    'view:machine', 'create:machine', 'edit:machine', 'delete:machine',
    // Masters - Operators
    'view:operator', 'create:operator', 'edit:operator', 'delete:operator',
    // Masters - Users
    'view:user', 'create:user', 'edit:user', 'delete:user',
    // Masters - Causes
    'view:cause', 'create:cause', 'edit:cause', 'delete:cause',
    // Masters - Standards
    'view:standard', 'create:standard', 'edit:standard', 'delete:standard',
    // Masters - Variation Types
    'view:variationType', 'create:variationType', 'edit:variationType', 'delete:variationType',
    // Summary & Analytics
    'view:summary', 'view:analytics',
    // Plans & Activities
    'view:plan', 'create:plan', 'edit:plan', 'delete:plan',
    'view:activity', 'edit:activity',
    // Additional Variations
    'view:additionalVariation', 'create:additionalVariation', 'edit:additionalVariation'
  ],
  COORDINATOR: [
    // Reports
    'view:report',
    // Tasks
    'view:task', 'analyze:task', 'create:plan',
    // Masters - Machines
    'view:machine', 'create:machine', 'edit:machine',
    // Masters - Operators
    'view:operator', 'create:operator', 'edit:operator',
    // Masters - Users
    'view:user', 'create:user', 'edit:user',
    // Masters - Causes
    'view:cause', 'create:cause', 'edit:cause',
    // Masters - Standards
    'view:standard', 'create:standard', 'edit:standard',
    // Masters - Variation Types
    'view:variationType', 'create:variationType', 'edit:variationType',
    // Summary
    'view:summary',
    // Plans & Activities
    'view:plan', 'edit:plan',
    'view:activity', 'edit:activity',
    // Additional Variations
    'view:additionalVariation', 'create:additionalVariation', 'edit:additionalVariation'
  ],
  GESTOR: [
    // Reports
    'view:report', 'create:report', 'edit:report', 'close:report',
    // Variations
    'create:variation', 'view:variation',
    // Tasks (view only)
    'view:task',
    // Additional Variations
    'view:additionalVariation', 'create:additionalVariation'
  ]
};

function checkRolePermission(role: string, action: string): PolicyResult {
  const permissions = ROLE_PERMISSIONS[role] || [];
  
  if (permissions.includes('*') || permissions.includes(action)) {
    return { allowed: true };
  }
  
  return { allowed: false, reason: `Tu rol (${role}) no puede realizar: ${action}` };
}

// ============================================
// ABAC: STATE → ACTION PERMISSIONS
// ============================================

const STATE_TRANSITIONS: Record<string, Record<string, string[]>> = {
  'report': {
    'OPEN': ['view:report', 'edit:report', 'close:report', 'create:variation'],
    'CLOSED': ['view:report'],
  },
  'task': {
    'POR_REVISAR': ['view:task', 'analyze:task'],
    'REVISADA': ['view:task', 'create:plan', 'approve:plan'],
    'EN_PLAN_DE_ACCION': ['view:task', 'revoke:plan'],
    'FINALIZADA': ['view:task']
  },
  'plan': {
    'BORRADOR': ['view:plan', 'edit:plan', 'delete:plan'],
    'PENDIENTE': ['view:plan', 'approve:plan', 'reject:plan'],
    'APROBADO': ['view:plan'],
    'EN_EJECUCION': ['view:plan', 'edit:activity'],
    'FINALIZADO': ['view:plan']
  },
  'additionalVariation': {
    'PENDIENTE': ['view:additionalVariation', 'edit:additionalVariation'],
    'REVISADO': ['view:additionalVariation'],
    'CERRADO': ['view:additionalVariation']
  }
};

function checkStatePermission(action: string, resourceType: string, status: string): PolicyResult {
  const allowedActions = STATE_TRANSITIONS[resourceType]?.[status];
  
  // If no state transitions defined for this resource type, allow the action
  if (!allowedActions) {
    return { allowed: true };
  }

  if (allowedActions.includes(action)) {
    return { allowed: true };
  }

  return { 
    allowed: false, 
    reason: `No se puede realizar "${action}" cuando el estado es "${status}".` 
  };
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Check if the current user can perform an action on a resource.
 * Use this for mutation validation (create, update, delete).
 */
export async function canPerformAction(
  action: string,
  resource?: { type: string; areaId?: string; status?: string; createdById?: string }
): Promise<PolicyResult> {
  const ctx = await buildPolicyContext(action, resource);
  if (!ctx) {
    return { allowed: false, reason: 'No autenticado' };
  }
  return await evaluatePolicy(ctx);
}

/**
 * Get the list of area IDs the current user has access to.
 * Returns null for ADMIN (no filter needed).
 * Use this for query filtering.
 */
export async function getAllowedAreaIds(): Promise<string[] | null> {
  const ctx = await getRBACContext();
  if (!ctx) return [];
  if (ctx.isAdmin) return null; // null = no filter
  return ctx.allowedAreaIds;
}

/**
 * Get the list of areas the current user has access to (with names).
 * Use this for populating area dropdowns.
 */
export async function getAllowedAreas(): Promise<{ id: string; name: string }[]> {
  const ctx = await getRBACContext();
  if (!ctx) return [];
  
  // For ADMIN, fetch all areas
  if (ctx.isAdmin) {
    const allAreas = await prisma.area.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });
    return allAreas;
  }
  
  return ctx.allowedAreas;
}

/**
 * Check if the current user is an ADMIN.
 */
export async function isAdmin(): Promise<boolean> {
  const ctx = await getRBACContext();
  return ctx?.isAdmin || false;
}

/**
 * Build a Prisma WHERE clause for area filtering.
 * Supports optional selected area filter.
 */
export async function buildAreaFilter(
  allowedAreaIds: string[] | null, 
  selectedAreaId?: string,
  areaField = 'areaId'
): Promise<Record<string, unknown>> {
  // ADMIN: no restriction, but can still filter by selection
  if (allowedAreaIds === null) {
    if (selectedAreaId && selectedAreaId !== 'ALL') {
      return { [areaField]: selectedAreaId };
    }
    return {};
  }

  // Non-admin: restrict to allowed areas
  if (selectedAreaId && selectedAreaId !== 'ALL' && allowedAreaIds.includes(selectedAreaId)) {
    return { [areaField]: selectedAreaId };
  }
  
  return { [areaField]: { in: allowedAreaIds } };
}

/**
 * Validate that an area ID is within the user's allowed areas.
 * Use this before creating/updating entities.
 */
export async function validateAreaAccess(areaId: string): Promise<PolicyResult> {
  const allowedIds = await getAllowedAreaIds();
  
  // ADMIN has access to all
  if (allowedIds === null) {
    return { allowed: true };
  }
  
  if (allowedIds.includes(areaId)) {
    return { allowed: true };
  }
  
  return { allowed: false, reason: 'No tienes acceso a esta área.' };
}
