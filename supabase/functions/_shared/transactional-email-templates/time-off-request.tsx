import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Html, Preview, Text, Hr, Section, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "WorkSchedule"

interface TimeOffRequestProps {
  employeeName?: string
  startDate?: string
  endDate?: string
  reason?: string
  notes?: string
}

const TimeOffRequestEmail = ({ employeeName, startDate, endDate, reason, notes }: TimeOffRequestProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New time-off request from {employeeName || 'an employee'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={titleBanner}>
          <Row>
            <Column style={{ width: '32px', verticalAlign: 'middle' as const }}>
              <Text style={clockIcon}>🕐</Text>
            </Column>
            <Column style={{ verticalAlign: 'middle' as const }}>
              <Text style={titleText}>New Time-Off Request</Text>
            </Column>
          </Row>
        </Section>
        <Text style={text}>
          <strong>{employeeName || 'An employee'}</strong> has submitted a time-off request.
        </Text>
        <Section style={detailsBox}>
          <Text style={detailRow}><strong>Dates:</strong> {startDate || '—'} to {endDate || '—'}</Text>
          <Text style={detailRow}><strong>Reason:</strong> {reason || '—'}</Text>
          {notes ? <Text style={detailRow}><strong>Notes:</strong> {notes}</Text> : null}
        </Section>
        <Text style={text}>
          Log in to {SITE_NAME} to approve or reject this request.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>Sent via {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TimeOffRequestEmail,
  subject: (data: Record<string, any>) => `Time-off request from ${data.employeeName || 'an employee'}`,
  displayName: 'Time-off request notification',
  previewData: { employeeName: 'Jane Smith', startDate: 'Jan 20, 2025', endDate: 'Jan 22, 2025', reason: 'Vacation', notes: 'Family trip' },
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
