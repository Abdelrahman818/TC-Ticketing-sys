import { API_ROUTES, apiRequest } from '@/config';

export async function getDepartments() {
  const payload = await apiRequest(API_ROUTES.departments.list);
  return payload?.data?.departments || [];
}

export async function createDepartment(data) {
  const payload = await apiRequest(API_ROUTES.departments.list, {
    method: 'POST',
    body: data,
  });
  return payload?.data?.department;
}

export async function updateDepartment(id, data) {
  const payload = await apiRequest(API_ROUTES.departments.byId(id), {
    method: 'PATCH',
    body: data,
  });
  return payload?.data?.department;
}

export async function deleteDepartment(id) {
  const payload = await apiRequest(API_ROUTES.departments.byId(id), {
    method: 'DELETE',
  });
  return payload;
}
