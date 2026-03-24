import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "WorkSchedule"

interface TimeOffDecisionProps {
  employeeName?: string
  startDate?: string
  endDate?: string
  reason?: string
  decision?: 'approved' | 'rejected'
}

const TimeOffDecisionEmail = ({ employeeName, startDate, endDate, reason, decision = 'approved' }: TimeOffDecisionProps) => {
  const isApproved = decision === 'approved'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your time-off request has been {decision}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            Time-Off Request {isApproved ? 'Approved ✅' : 'Denied ❌'}
          </Heading>
          <Text style={text}>
            {employeeName ? `Hi ${employeeName},` : 'Hi,'}
          </Text>
          <Text style={text}>
            Your time-off request has been <strong>{decision}</strong> by your manager.
          </Text>
          <Section style={detailsBox}>
            <Text style={detailRow}><strong>Dates:</strong> {startDate || '—'} to {endDate || '—'}</Text>
            <Text style={detailRow}><strong>Reason:</strong> {reason || '—'}</Text>
            <Text style={{ ...detailRow, color: isApproved ? '#16a34a' : '#dc2626', fontWeight: '600' as const }}>
              <strong>Status:</strong> {isApproved ? 'Approved' : 'Denied'}
            </Text>
          </Section>
          <Text style={text}>
            {isApproved
              ? 'Your time off has been confirmed. Enjoy your time away!'
              : 'If you have questions about this decision, please speak with your manager.'}
          </Text>
          <Hr style={hr} />
          <Text style={footer}>Sent via {SITE_NAME}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: TimeOffDecisionEmail,
  subject: (data: Record<string, any>) =>
    `Your time-off request has been ${data.decision === 'rejected' ? 'denied' : 'approved'}`,
  displayName: 'Time-off request decision',
  previewData: { employeeName: 'Jane', startDate: 'Jan 20, 2025', endDate: 'Jan 22, 2025', reason: 'Vacation', decision: 'approved' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '20px', fontWeight: '600' as const, color: '#1a1a2e', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#444', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '16px', margin: '0 0 20px' }
const detailRow = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0 0 4px' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }
