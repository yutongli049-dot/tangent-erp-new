/** 业务单元：驾校一单一结，不走预付课时门槛 */
export function isDrivingSchoolBusiness(businessId?: string | null): boolean {
  return typeof businessId === "string" && businessId.toLowerCase().includes("sine");
}
