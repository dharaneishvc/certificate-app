# 04 · Database Design

PostgreSQL via Prisma ORM. Source of truth: [`prisma/schema.prisma`](../prisma/schema.prisma).

## 1. ER diagram

```mermaid
erDiagram
    User ||--o{ EmailToken : has
    User ||--o{ Membership : "member of"
    User ||--o{ Credential : "receives (recipientId)"
    User ||--o{ Credential : "issues (issuedById)"
    User ||--o{ AuditLog : performs

    Organization ||--o{ Organization : "parent of"
    Organization ||--o{ OrgKey : owns
    Organization ||--o{ Membership : has
    Organization ||--o{ Template : defines
    Organization ||--o{ Credential : issues
    Organization ||--o{ AuditLog : "scoped to"

    Template ||--o{ TemplateSignatory : lists
    Membership ||--o{ TemplateSignatory : "signs as"
    Template ||--o{ Credential : instantiates
    OrgKey ||--o{ Credential : "signed with"

    User {
        string id PK
        string handle UK
        string email UK
        string name
        string passwordHash
        string bio
        datetime emailVerifiedAt
        enum profileVisibility
    }
    EmailToken {
        string id PK
        string userId FK
        string tokenHash UK
        datetime expiresAt
    }
    Organization {
        string id PK
        string slug UK
        string name
        string parentId FK
        string domain
        enum domainStatus
        string domainToken
        string createdById FK
    }
    OrgKey {
        string id PK "keyId"
        string orgId FK
        string publicKey
        string encryptedPrivateKey
        bool active
    }
    Membership {
        string id PK
        string userId FK
        string orgId FK
        enum_array roles
        string title
    }
    Template {
        string id PK
        string orgId FK
        string name
        enum type
        json fields
        string accentColor
        bool archived
    }
    TemplateSignatory {
        string templateId PK,FK
        string membershipId PK,FK
        int position
    }
    Credential {
        string id PK
        string orgId FK
        string templateId FK
        string recipientId FK
        string recipientEmail
        string recipientName
        json payload
        string payloadHash
        string signature
        string keyId FK
        enum visibility
        enum status
        datetime issuedAt
        datetime expiresAt
        datetime revokedAt
    }
    AuditLog {
        string id PK
        string orgId FK
        string actorId FK
        string action
        string targetType
        string targetId
        json meta
    }
```

## 2. Enums

| Enum | Values |
|------|--------|
| `ProfileVisibility` | `PUBLIC`, `PRIVATE` |
| `CredentialVisibility` | `PUBLIC`, `UNLISTED`, `PRIVATE` |
| `CredentialStatus` | `ACTIVE`, `REVOKED` (EXPIRED is derived) |
| `CredentialType` | `COURSE`, `EVENT`, `PARTICIPATION`, `ACHIEVEMENT`, `EMPLOYMENT`, `INTERNSHIP`, `DEGREE`, `MEMBERSHIP`, `OTHER` |
| `OrgRole` | `ADMIN`, `ISSUER`, `SIGNATORY` |
| `DomainStatus` | `NONE`, `PENDING`, `VERIFIED` |

## 3. Tables

### User
| Column | Type | Constraints |
|--------|------|-------------|
| id | text | PK (cuid) |
| handle | text | UNIQUE — public identity key |
| email | text | UNIQUE, stored lower-case |
| name | text | NOT NULL |
| passwordHash | text | bcrypt, cost 12 |
| bio | text | nullable |
| emailVerifiedAt | timestamptz | nullable |
| profileVisibility | enum | default `PUBLIC` |

### Organization
| Column | Type | Constraints |
|--------|------|-------------|
| id | text | PK |
| slug | text | UNIQUE |
| parentId | text | FK → Organization.id, nullable, INDEX |
| domain | text | nullable |
| domainStatus | enum | default `NONE` |
| domainToken | text | random, shown as TXT value |
| createdById | text | FK → User.id |

### OrgKey
Private key is **AES-256-GCM encrypted** with `MASTER_KEY` (env). Format `iv.authTag.ciphertext` (base64).
Public key stored as base64 SPKI DER. `active = true` for the key used for new issuance; old keys are kept to
verify older credentials.

### Membership
`roles` is a Postgres enum array (`OrgRole[]`). `UNIQUE(userId, orgId)` – one row per user per org.

### Template
`fields` JSON: `[{ "key": "position", "label": "Position", "required": true }]`.

### Credential
| Column | Notes |
|--------|-------|
| id | 12-char public id (PK) |
| payload | exact signed JSON (immutable) |
| payloadHash | hex SHA-256 of canonical payload |
| signature | base64 Ed25519 signature |
| keyId | FK → OrgKey.id |
| recipientEmail | lower-case; used for claim. Never exposed publicly |
| recipientId | nullable until claimed |
| visibility / status | mutable, **not** signed |

### AuditLog
Append-only record of security-relevant actions (`ORG_CREATED`, `MEMBER_ADDED`, `CREDENTIAL_ISSUED`,
`CREDENTIAL_REVOKED`, `DOMAIN_VERIFIED`, …).

## 4. Indexes

| Table | Index | Query served |
|-------|-------|--------------|
| Credential | `(recipientId)` | holder dashboard / profile |
| Credential | `(recipientEmail)` | claim on email verification |
| Credential | `(orgId, issuedAt DESC)` | org credentials list |
| Membership | `(orgId)` | members list, permission check |
| Organization | `(parentId)` | sub-org list, chain walk |
| Template | `(orgId)` | template list |
| OrgKey | `(orgId)` | active key lookup |
| AuditLog | `(orgId, createdAt)` | activity feed |

## 5. Data integrity rules

- `Credential.payload`, `payloadHash`, `signature`, `keyId` are written once and never updated.
- Deleting a `Membership` cascades `TemplateSignatory`; credentials keep their signatory snapshot in the payload.
- Organisations and credentials are never hard-deleted (revocation instead) — required for verifiability.
- Email tokens are stored hashed; raw token exists only in the email link.
