import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Html, Preview, Text, Hr, Section, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "WorkSchedule"

interface TimeOffDecisionProps {
  employeeName?: string
  startDate?: string
  endDate?: string
  reason?: string
  decision?: 'approved' | 'rejected'
  explanation?: string
}

const TimeOffDecisionEmail = ({ employeeName, startDate, endDate, reason, decision = 'approved', explanation }: TimeOffDecisionProps) => {
  const isApproved = decision === 'approved'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your time-off request has been {decision}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={titleBanner}>
            <Row>
              <Column style={{ width: '32px', verticalAlign: 'middle' as const }}>
                <Text style={clockIcon}>🕐</Text>
              </Column>
              <Column style={{ verticalAlign: 'middle' as const }}>
                <Text style={titleText}>
                  Time-Off Request {isApproved ? 'Approved ✅' : 'Denied ❌'}
                </Text>
              </Column>
            </Row>
          </Section>
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
            {!isApproved && explanation && (
              <Text style={detailRow}><strong>Reason for denial:</strong> {explanation}</Text>
            )}
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
  previewData: { employeeName: 'Jane', startDate: 'Jan 20, 2025', endDate: 'Jan 22, 2025', reason: 'Vacation', decision: 'rejected', explanation: 'We need all hands on deck that week' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const titleBanner = { backgroundColor: '#2563eb', borderRadius: '8px', padding: '14px 20px', margin: '0 0 24px' }
const clockIcon = { fontSize: '20px', margin: '0', lineHeight: '1' }
const titleText = { fontSize: '18px', fontWeight: '700' as const, color: '#ffffff', margin: '0', lineHeight: '1.3' }
const text = { fontSize: '14px', color: '#444', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '16px', margin: '0 0 20px' }
const detailRow = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0 0 4px' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }
