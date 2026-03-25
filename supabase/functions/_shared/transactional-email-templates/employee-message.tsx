import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Html, Preview, Text, Hr, Section, Img, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "WorkSchedule"

const CLOCK_ICON = 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`)

interface EmployeeMessageProps {
  subject?: string
  messageBody?: string
  senderName?: string
}

const EmployeeMessageEmail = ({ subject, messageBody, senderName }: EmployeeMessageProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{subject || 'Message from your employer'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={titleBanner}>
          <Row>
            <Column style={{ width: '28px', verticalAlign: 'middle' as const }}>
              <Img src={CLOCK_ICON} width="22" height="22" alt="" style={{ display: 'block' }} />
            </Column>
            <Column style={{ verticalAlign: 'middle' as const, paddingLeft: '10px' }}>
              <Text style={titleText}>{subject || 'Message from your employer'}</Text>
            </Column>
          </Row>
        </Section>
        <Text style={text}>{messageBody || ''}</Text>
        <Hr style={hr} />
        <Text style={footer}>
          {senderName ? `Sent by ${senderName} via ${SITE_NAME}` : `Sent via ${SITE_NAME}`}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: EmployeeMessageEmail,
  subject: (data: Record<string, any>) => data.subject || 'Message from your employer',
  displayName: 'Employee message',
  previewData: { subject: 'Schedule Update', messageBody: 'Please note your shifts have been updated for next week.', senderName: 'Manager' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const titleBanner = { backgroundColor: '#2563eb', borderRadius: '8px', padding: '14px 20px', margin: '0 0 24px' }
const titleText = { fontSize: '18px', fontWeight: '700' as const, color: '#ffffff', margin: '0', lineHeight: '1.3' }
const text = { fontSize: '14px', color: '#444', lineHeight: '1.6', margin: '0 0 24px', whiteSpace: 'pre-wrap' as const }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }
