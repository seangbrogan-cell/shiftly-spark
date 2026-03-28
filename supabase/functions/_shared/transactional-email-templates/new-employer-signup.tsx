import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Html, Preview, Text, Hr, Section, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "WorkSchedule"

interface NewEmployerSignupProps {
  companyName?: string
  ownerName?: string
  ownerEmail?: string
}

const NewEmployerSignupEmail = ({ companyName, ownerName, ownerEmail }: NewEmployerSignupProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New employer signup: {companyName || 'Unknown'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={titleBanner}>
          <Row>
            <Column style={{ width: '32px', verticalAlign: 'middle' as const }}>
              <Text style={clockIcon}>🏢</Text>
            </Column>
            <Column style={{ verticalAlign: 'middle' as const }}>
              <Text style={titleText}>New Employer Signup</Text>
            </Column>
          </Row>
        </Section>
        <Text style={text}>A new employer has just created an account on {SITE_NAME}.</Text>
        <Section style={detailsBox}>
          <Text style={detailLabel}>Company Name</Text>
          <Text style={detailValue}>{companyName || 'Not provided'}</Text>
          <Text style={detailLabel}>Owner Name</Text>
          <Text style={detailValue}>{ownerName || 'Not provided'}</Text>
          <Text style={detailLabel}>Owner Email</Text>
          <Text style={detailValue}>{ownerEmail || 'Not provided'}</Text>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>This is an automated alert from {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewEmployerSignupEmail,
  subject: (data: Record<string, any>) => `New employer signup: ${data.companyName || 'Unknown'}`,
  to: 'seanandchez@gmail.com',
  displayName: 'New employer signup alert',
  previewData: { companyName: 'Acme Inc.', ownerName: 'Jane Smith', ownerEmail: 'jane@acme.com' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const titleBanner = { backgroundColor: '#2563eb', borderRadius: '8px', padding: '14px 20px', margin: '0 0 24px' }
const clockIcon = { fontSize: '20px', margin: '0', lineHeight: '1' }
const titleText = { fontSize: '18px', fontWeight: '700' as const, color: '#ffffff', margin: '0', lineHeight: '1.3' }
const text = { fontSize: '14px', color: '#444', lineHeight: '1.6', margin: '0 0 24px' }
const detailsBox = { backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px 20px', margin: '0 0 24px' }
const detailLabel = { fontSize: '11px', color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 2px', fontWeight: '600' as const }
const detailValue = { fontSize: '15px', color: '#111', margin: '0 0 14px', fontWeight: '500' as const }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }
