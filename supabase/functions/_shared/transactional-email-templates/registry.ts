/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as employeeMessage } from './employee-message.tsx'
import { template as timeOffRequest } from './time-off-request.tsx'
import { template as timeOffConfirmation } from './time-off-confirmation.tsx'
import { template as timeOffDecision } from './time-off-decision.tsx'
import { template as newEmployerSignup } from './new-employer-signup.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'employee-message': employeeMessage,
  'time-off-request': timeOffRequest,
  'time-off-confirmation': timeOffConfirmation,
  'time-off-decision': timeOffDecision,
  'new-employer-signup': newEmployerSignup,
}
