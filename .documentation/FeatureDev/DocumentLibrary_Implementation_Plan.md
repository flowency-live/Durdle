# Document Library Feature - Implementation Plan

**Feature:** Admin Document Library with Comments and Editing
**Owner:** Development Team
**Created:** 2025-12-05
**Status:** In Progress

---

## Executive Summary

Implement an admin-only document library to view, comment on, and edit markdown documents from `.documentation/WorkingDocuments/`. The system enables collaborative review where admins can add comments with resolved/unresolved status, then export the document + comments for Claude review sessions.

---

## Requirements Summary

### User Decisions
- **Comments Type:** Simple (bottom of page) - POC first
- **Publishing:** Direct edit and save
- **Multi-user:** Potentially multiple admins editing (awareness via "last edited by")
- **Permissions:** All admins can view, comment, and edit

### Key Workflow
1. Admin views markdown document rendered beautifully
2. Admin adds comments (resolved/unresolved status)
3. Admin can edit document directly (saves to .md file)
4. Admin exports document + all comments for Claude review
5. After Claude session, comments are marked resolved or removed

---

## Technical Architecture

### Frontend Stack
- **Framework:** Next.js 14 App Router
- **Markdown Rendering:** `react-markdown` + `remark-gfm` + `rehype-highlight`
- **Markdown Editor:** `@uiw/react-md-editor`
- **ID Generation:** `ulid` (for comment IDs)

### Backend Stack
- **File Operations:** Next.js API Routes (Node.js `fs` module)
- **Comments Storage:** DynamoDB + Lambda + API Gateway
- **Authentication:** Existing admin JWT token system

### Security
- All routes require admin JWT authentication
- File writes restricted to `.documentation/WorkingDocuments/` only
- Path traversal prevention (no `../` allowed in filenames)
- Comments tied to authenticated user email

---

## Database Schema

### DynamoDB Table: `durdle-document-comments-dev`

```
Table Structure:
PK: DOC#[filename]
SK: COMMENT#[timestamp-ulid]

Attributes:
- documentPath: string (e.g., "COO_Actions.md")
- commentId: string (ulid)
- username: string (admin email)
- comment: string (markdown supported)
- status: "unresolved" | "resolved"
- created: string (ISO 8601)
- updated: string (ISO 8601)

GSI (Optional for future):
- GSI1PK: USER#[username]
- GSI1SK: COMMENT#[timestamp-ulid]
```

---

## API Specification

### Next.js API Routes (File Operations)

**1. List Documents**
```
GET /api/admin/documents
Authorization: Bearer [JWT]

Response:
{
  "documents": [
    {
      "filename": "COO_Actions.md",
      "path": ".documentation/WorkingDocuments/COO_Actions.md",
      "lastModified": "2025-12-05T14:30:00Z",
      "size": 45678,
      "commentCount": 3
    }
  ]
}
```

**2. Get Document Content**
```
GET /api/admin/documents/[filename]
Authorization: Bearer [JWT]

Response:
{
  "filename": "COO_Actions.md",
  "content": "# Document content here...",
  "lastModified": "2025-12-05T14:30:00Z",
  "lastEditedBy": "john@example.com"
}
```

**3. Update Document Content**
```
PUT /api/admin/documents/[filename]
Authorization: Bearer [JWT]
Content-Type: application/json

Request:
{
  "content": "# Updated markdown content..."
}

Response:
{
  "success": true,
  "filename": "COO_Actions.md",
  "lastModified": "2025-12-05T15:45:00Z"
}
```

**4. Export Document + Comments**
```
GET /api/admin/documents/[filename]/export
Authorization: Bearer [JWT]

Response: (text/plain)
# Document: COO_Actions.md
Last Modified: 2025-12-05

[Full document + comments formatted for Claude review]
```

### Lambda + API Gateway (Comments)

**Lambda Function:** `document-comments-dev`

**1. Get Comments**
```
GET /admin/documents/:filename/comments
Authorization: Bearer [JWT]

Response:
{
  "comments": [
    {
      "commentId": "01HJQK3T5X...",
      "documentPath": "COO_Actions.md",
      "username": "john@example.com",
      "comment": "Need clarification on VAT section",
      "status": "unresolved",
      "created": "2025-12-05T14:30:00Z",
      "updated": "2025-12-05T14:30:00Z"
    }
  ],
  "count": 3
}
```

**2. Create Comment**
```
POST /admin/documents/:filename/comments
Authorization: Bearer [JWT]
Content-Type: application/json

Request:
{
  "comment": "Add example calculation for £100 booking"
}

Response:
{
  "commentId": "01HJQK3T5X...",
  "documentPath": "COO_Actions.md",
  "username": "john@example.com",
  "comment": "Add example calculation for £100 booking",
  "status": "unresolved",
  "created": "2025-12-05T15:00:00Z"
}
```

**3. Update Comment Status**
```
PATCH /admin/documents/:filename/comments/:commentId
Authorization: Bearer [JWT]
Content-Type: application/json

Request:
{
  "status": "resolved"
}

Response:
{
  "success": true,
  "commentId": "01HJQK3T5X...",
  "status": "resolved",
  "updated": "2025-12-05T16:00:00Z"
}
```

**4. Delete Comment**
```
DELETE /admin/documents/:filename/comments/:commentId
Authorization: Bearer [JWT]

Response:
{
  "success": true,
  "commentId": "01HJQK3T5X..."
}
```

---

## UI/UX Design

### Document List Page (`/admin/documents`)

```
┌─────────────────────────────────────────┐
│ Documents                    [+ New Doc]│
├─────────────────────────────────────────┤
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 📄 COO_Actions.md                   │ │
│ │ Last modified: 2025-12-05 14:30     │ │
│ │ Comments: 3 (2 unresolved)          │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 📄 Technical_Spec.md                │ │
│ │ Last modified: 2025-12-04 10:15     │ │
│ │ Comments: 0                         │ │
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

### Document Viewer Page (`/admin/documents/[slug]`)

**Desktop Layout (3-column):**
```
┌────────────────────────────────────────────────────────────┐
│ ← Back to Documents    COO_Actions.md    [Edit] [Export]  │
├────────────────────────────────────────────────────────────┤
│                                │                           │
│  RENDERED MARKDOWN (70%)       │   COMMENTS (30%)          │
│                                │                           │
│  # Payment Processing          │  💬 Add Comment           │
│                                │  ┌─────────────────────┐  │
│  This document outlines...     │  │                     │  │
│                                │  │ Type comment...     │  │
│  ## VAT Considerations         │  │                     │  │
│                                │  └─────────────────────┘  │
│  The UK VAT threshold is...    │  [Post Comment]           │
│                                │                           │
│  ```javascript                 │  ─── Comments (3) ────    │
│  const vatRate = 0.20;         │                           │
│  ```                           │  🔴 UNRESOLVED            │
│                                │  John • 2hrs ago          │
│                                │  "Need clarification on   │
│                                │   VAT section"            │
│                                │  [Mark Resolved]          │
│                                │                           │
│                                │  🔴 UNRESOLVED            │
│                                │  Sarah • 1hr ago          │
│                                │  "Add example calc"       │
│                                │  [Mark Resolved]          │
│                                │                           │
│                                │  ✅ RESOLVED              │
│                                │  John • 3hrs ago          │
│                                │  "PHV license needed"     │
│                                │  [Reopen]                 │
│                                │                           │
└────────────────────────────────────────────────────────────┘
```

**Mobile Layout (stacked):**
```
┌────────────────────────┐
│ ← Back                 │
│ COO_Actions.md         │
│ [Edit] [Export]        │
├────────────────────────┤
│                        │
│  # Payment Processing  │
│                        │
│  This document...      │
│                        │
│  ## VAT Considerations │
│                        │
├────────────────────────┤
│  💬 Comments (3)       │
│                        │
│  [Add Comment]         │
│                        │
│  🔴 UNRESOLVED         │
│  John • 2hrs ago       │
│  "Need clarification"  │
│  [Resolve]             │
│                        │
└────────────────────────┘
```

### Edit Mode

**Split View:**
```
┌────────────────────────────────────────────────────────────┐
│ ← Cancel    Editing: COO_Actions.md         [Save Changes] │
├────────────────────────────────────────────────────────────┤
│                                │                           │
│  MARKDOWN SOURCE (50%)         │   LIVE PREVIEW (50%)      │
│                                │                           │
│  # Payment Processing          │   # Payment Processing    │
│                                │                           │
│  This document outlines the    │   This document outlines  │
│  payment processing...         │   the payment processing  │
│                                │                           │
│  ## VAT Considerations         │   ## VAT Considerations   │
│                                │                           │
│  The UK VAT threshold...       │   The UK VAT threshold    │
│                                │                           │
└────────────────────────────────────────────────────────────┘
│ Last edited by: john@example.com on 2025-12-05 14:30      │
└────────────────────────────────────────────────────────────┘
```

### Export Format

```markdown
# Document: COO_Actions.md
Last Modified: 2025-12-05 14:30:00
Document Path: .documentation/WorkingDocuments/COO_Actions.md

---

## DOCUMENT CONTENT

[Full markdown content of the document here...]

---

## COMMENTS SUMMARY

Total Comments: 3
Unresolved: 2
Resolved: 1

---

## UNRESOLVED COMMENTS (2)

### Comment 1
**ID:** 01HJQK3T5X...
**By:** john@example.com
**Date:** 2025-12-05 14:30:00
**Status:** Unresolved

The VAT section needs clarification on registration threshold timing.

---

### Comment 2
**ID:** 01HJQK4R8Y...
**By:** sarah@example.com
**Date:** 2025-12-05 15:15:00
**Status:** Unresolved

Add example calculation for £100 booking with VAT breakdown.

---

## RESOLVED COMMENTS (1)

### Comment 3
**ID:** 01HJQJ9M2Z...
**By:** john@example.com
**Date:** 2025-12-05 10:00:00
**Status:** Resolved (2025-12-05 12:30:00)

PHV license number needs to be added to all receipts.
**Resolution note:** Added to section 3.2

---

END OF EXPORT
```

---

## Implementation Checklist

### Phase 1: Setup & Navigation ✅
- [ ] Install required npm packages
  - [ ] `react-markdown`
  - [ ] `remark-gfm`
  - [ ] `rehype-highlight`
  - [ ] `@uiw/react-md-editor`
  - [ ] `ulid`
- [ ] Add "Documents" link to admin sidebar nav (FileText icon)
- [ ] Create route structure
  - [ ] `/admin/documents/page.tsx`
  - [ ] `/admin/documents/[slug]/page.tsx`

### Phase 2: Document List Page
- [ ] Create Next.js API route: `GET /api/admin/documents`
- [ ] Implement file system read of `.documentation/WorkingDocuments/`
- [ ] Add JWT authentication middleware
- [ ] Create document list UI component
  - [ ] Card layout with filename, last modified, comment count
  - [ ] Click to navigate to viewer
  - [ ] Loading state
  - [ ] Error handling

### Phase 3: Document Viewer (Read-Only)
- [ ] Create Next.js API route: `GET /api/admin/documents/[filename]`
- [ ] Add path traversal prevention security
- [ ] Create document viewer component
  - [ ] Markdown rendering with nice typography
  - [ ] Code syntax highlighting
  - [ ] Table of contents (auto-generated from headings)
  - [ ] "Last modified" display
  - [ ] Edit button (non-functional initially)
  - [ ] Export button (non-functional initially)

### Phase 4: Comments Backend
- [ ] Create DynamoDB table: `durdle-document-comments-dev`
  ```bash
  aws dynamodb create-table \
    --table-name durdle-document-comments-dev \
    --attribute-definitions \
      AttributeName=PK,AttributeType=S \
      AttributeName=SK,AttributeType=S \
    --key-schema \
      AttributeName=PK,KeyType=HASH \
      AttributeName=SK,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region eu-west-2
  ```
- [ ] Create Lambda function: `document-comments-dev`
  - [ ] GET handler (list comments for document)
  - [ ] POST handler (create comment)
  - [ ] PATCH handler (update comment status)
  - [ ] DELETE handler (delete comment)
  - [ ] JWT authentication
  - [ ] DynamoDB integration
- [ ] Update IAM role permissions for DynamoDB access
- [ ] Create API Gateway routes
  - [ ] `GET /admin/documents/:filename/comments`
  - [ ] `POST /admin/documents/:filename/comments`
  - [ ] `PATCH /admin/documents/:filename/comments/:commentId`
  - [ ] `DELETE /admin/documents/:filename/comments/:commentId`
- [ ] Deploy Lambda and test endpoints

### Phase 5: Comments Frontend
- [ ] Create comments sidebar component
  - [ ] Display all comments (resolved + unresolved)
  - [ ] Status badges (red=unresolved, green=resolved)
  - [ ] Username and timestamp display
  - [ ] Sort by newest/oldest
- [ ] Create "Add Comment" form
  - [ ] Textarea for comment text
  - [ ] Post button
  - [ ] Loading state
  - [ ] Success/error feedback
- [ ] Implement comment actions
  - [ ] "Mark Resolved" button
  - [ ] "Reopen" button (for resolved comments)
  - [ ] "Delete" button (own comments only)
  - [ ] Confirmation dialogs
- [ ] Wire up to backend API
- [ ] Add comment count to document list page

### Phase 6: Edit Mode
- [ ] Create Next.js API route: `PUT /api/admin/documents/[filename]`
- [ ] Implement markdown editor component
  - [ ] Split view: source | preview
  - [ ] Use `@uiw/react-md-editor`
  - [ ] Load current content on mount
  - [ ] Real-time preview updates
- [ ] Implement save functionality
  - [ ] Validate content before save
  - [ ] Write to .md file
  - [ ] Update "last edited by" metadata
  - [ ] Success feedback
  - [ ] Error handling
- [ ] Add "Edit" / "View" mode toggle
- [ ] Add "Cancel" button (with unsaved changes warning)
- [ ] Display "Last edited by [user] at [time]"

### Phase 7: Export Functionality
- [ ] Create Next.js API route: `GET /api/admin/documents/[filename]/export`
- [ ] Implement export format
  - [ ] Document metadata header
  - [ ] Full markdown content
  - [ ] Comments section (unresolved first, then resolved)
  - [ ] Plain text format optimized for Claude review
- [ ] Add "Export for Claude" button
  - [ ] Downloads as .txt file
  - [ ] Or copy to clipboard option
  - [ ] Filename: `[document]_export_[date].txt`

### Phase 8: Polish & Testing
- [ ] Mobile responsive design
  - [ ] Stacked layout on mobile
  - [ ] Touch-friendly buttons
  - [ ] Readable typography on small screens
- [ ] Loading states everywhere
- [ ] Error handling and user feedback
- [ ] Confirmation dialogs for destructive actions
- [ ] Add search/filter to document list (optional)
- [ ] Add markdown formatting help (optional)
- [ ] Security audit
  - [ ] Test JWT validation
  - [ ] Test path traversal prevention
  - [ ] Test XSS in comments
- [ ] End-to-end testing
  - [ ] Create document
  - [ ] Add comments
  - [ ] Edit document
  - [ ] Mark comments resolved
  - [ ] Export document
- [ ] Performance optimization
  - [ ] Lazy load comments
  - [ ] Debounce edit preview
  - [ ] Cache file reads

---

## Progress Tracker

### Overall Progress: 0% Complete

| Phase | Status | Progress | Estimated Time | Actual Time |
|-------|--------|----------|----------------|-------------|
| Phase 1: Setup & Navigation | ⏳ Not Started | 0% | 2 hours | - |
| Phase 2: Document List | ⏳ Not Started | 0% | 3 hours | - |
| Phase 3: Document Viewer | ⏳ Not Started | 0% | 4 hours | - |
| Phase 4: Comments Backend | ⏳ Not Started | 0% | 5 hours | - |
| Phase 5: Comments Frontend | ⏳ Not Started | 0% | 4 hours | - |
| Phase 6: Edit Mode | ⏳ Not Started | 0% | 4 hours | - |
| Phase 7: Export | ⏳ Not Started | 0% | 2 hours | - |
| Phase 8: Polish & Testing | ⏳ Not Started | 0% | 4 hours | - |

**Total Estimated Time:** 28 hours (~3.5 days)

### Status Legend
- ⏳ Not Started
- 🚧 In Progress
- ✅ Complete
- ⚠️ Blocked

---

## Technical Decisions Log

### 2025-12-05: Initial Architecture
- **Decision:** Use simple bottom-of-page comments (not inline)
- **Rationale:** POC first, simpler implementation, sufficient for workflow
- **Decision:** Direct edit and save (not draft/publish)
- **Rationale:** Single admin environment, immediate feedback preferred
- **Decision:** DynamoDB for comments storage
- **Rationale:** Consistent with existing architecture, scalable
- **Decision:** Next.js API routes for file operations
- **Rationale:** Avoid Lambda cold starts for file I/O, simpler implementation

---

## Security Considerations

### Authentication
- All API routes require valid admin JWT token
- Token validated on every request
- No anonymous access to documents or comments

### File System Security
- File writes restricted to `.documentation/WorkingDocuments/` directory only
- Path traversal attack prevention (reject paths with `../`)
- Filename validation (alphanumeric, hyphens, underscores, `.md` only)
- No file deletion capability (safety measure)

### Input Validation
- Comment text: max 5000 characters
- Document content: max 1MB
- Filename: max 255 characters, `.md` extension required
- XSS prevention: sanitize markdown rendering

### DynamoDB Security
- Lambda execution role has minimal required permissions
- Only CRUD operations on `durdle-document-comments-dev` table
- Comments tied to authenticated user (no spoofing)

---

## Future Enhancements (Post-MVP)

### Version Control
- Track document edit history
- Show diff between versions
- Rollback capability
- "Who changed what when" audit log

### Inline Comments
- Google Docs-style commenting on specific lines/paragraphs
- Comment threads (replies to comments)
- @mentions for notifying specific admins

### Collaboration Features
- Real-time editing (multiple users)
- Presence indicators ("John is viewing this document")
- Lock documents while editing (prevent conflicts)
- Conflict resolution for simultaneous edits

### Enhanced Export
- Export to PDF with comments sidebar
- Export specific sections only
- Include comment threads in export
- Export multiple documents at once

### Document Management
- Create new documents from UI
- Organize documents into folders
- Tags/categories for documents
- Full-text search across all documents

### Notifications
- Email notification on new comments
- Daily digest of unresolved comments
- @mentions trigger email to specific admin

---

## Testing Plan

### Unit Tests
- [ ] Markdown rendering component
- [ ] Comment CRUD operations
- [ ] File read/write utilities
- [ ] Export formatter
- [ ] Path validation

### Integration Tests
- [ ] API routes with JWT authentication
- [ ] Lambda function with DynamoDB
- [ ] End-to-end comment workflow

### Manual Testing Scenarios
1. **Happy Path:**
   - Admin logs in
   - Views document list
   - Opens document
   - Adds comment
   - Edits document
   - Saves changes
   - Exports document
   - Reviews export in Claude
   - Marks comments as resolved

2. **Error Cases:**
   - Invalid JWT token
   - Path traversal attempt
   - Concurrent edits
   - Network failure during save
   - DynamoDB unavailable
   - Malformed markdown

3. **Edge Cases:**
   - Very large documents (>500KB)
   - Documents with many comments (>100)
   - Special characters in filenames
   - Empty documents
   - Documents with no comments

---

## Deployment Checklist

### Prerequisites
- [ ] All npm packages installed
- [ ] DynamoDB table created
- [ ] Lambda function deployed
- [ ] API Gateway routes configured
- [ ] IAM permissions updated

### Deployment Steps
1. [ ] Merge feature branch to main
2. [ ] Deploy Lambda function
3. [ ] Deploy API Gateway changes
4. [ ] Deploy Next.js application (Amplify auto-deploy)
5. [ ] Verify DynamoDB table exists
6. [ ] Test in production environment
7. [ ] Monitor CloudWatch logs for errors

### Rollback Plan
- [ ] Keep previous Lambda version as alias
- [ ] Document rollback commands
- [ ] Test rollback procedure in dev environment

---

## Support & Maintenance

### Monitoring
- CloudWatch logs for Lambda errors
- API Gateway request metrics
- DynamoDB read/write capacity
- Next.js server errors

### Common Issues
- **Comments not loading:** Check Lambda permissions for DynamoDB
- **Edit save fails:** Verify file write permissions
- **Export empty:** Check document path and comment query

### Troubleshooting
1. Check CloudWatch logs: `/aws/lambda/document-comments-dev`
2. Verify DynamoDB table exists: `aws dynamodb describe-table --table-name durdle-document-comments-dev`
3. Test API endpoints directly with curl
4. Check browser console for frontend errors

---

## Contact & Resources

**Feature Owner:** Development Team
**Primary Developer:** TBD
**Reviewer:** TBD

**Related Documentation:**
- [Security & Compliance](../SecurityCompliance.md)
- [Technical Architecture](../TechnicalArchitecture.md)
- [Database Schema](../DatabaseSchema.md)

**External Resources:**
- [react-markdown docs](https://github.com/remarkjs/react-markdown)
- [MDEditor docs](https://uiwjs.github.io/react-md-editor/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-05 | Initial implementation plan created | Development Team |

---

**END OF DOCUMENT**
