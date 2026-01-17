# Privacy Policy

**Last Updated: January 2025**

AI FileSense ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how our desktop application handles your information.

## Summary

**Your files stay on your computer.** AI FileSense is a local-first application. We do not upload, store, or have access to your files.

## What Data We Process

### Local Processing (On Your Computer)
- **File metadata**: Filenames, file sizes, dates, and folder locations
- **File content snippets**: Small text excerpts (first ~500 characters) for AI classification
- **Organization history**: Records of file movements for undo functionality

All of this data is stored **locally** in a SQLite database on your computer at:
`%APPDATA%/com.aifileense.app/filesense.db`

### Data Sent to AI Providers
When you use AI-powered features, the following is sent to your configured AI provider (Anthropic):
- Filenames
- File extensions
- Small text snippets (for document classification)

**We never send:**
- Full file contents
- Personal identification information
- File paths containing usernames (paths are anonymized)

## Third-Party Services

### Anthropic API
AI FileSense uses the Anthropic API for document classification. When you use AI features:
- You provide your own API key
- Data is sent directly from your computer to Anthropic
- Anthropic's privacy policy applies: https://www.anthropic.com/privacy

We do not have access to your API key or the data you send to Anthropic.

## Data Storage

### Local Storage Only
- All file indexes are stored locally on your computer
- Organization plans and history are stored locally
- Settings (including your API key) are stored locally and encrypted

### No Cloud Storage
- We do not operate servers that store your data
- We do not have user accounts or cloud sync
- Your data never passes through our systems

## Data Retention

- All data is stored locally until you delete it
- Uninstalling the application removes all local data
- You can delete the database file at any time

## Your Rights

You have complete control over your data:
- **Access**: All data is stored locally and accessible to you
- **Deletion**: Delete the app data folder to remove all data
- **Portability**: The SQLite database can be exported or backed up

## Children's Privacy

AI FileSense is not intended for children under 13. We do not knowingly collect information from children.

## Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last Updated" date.

## Contact Us

If you have questions about this Privacy Policy, please contact us at:
- Email: privacy@aifilesense.com
- Website: https://aifilesense.com/contact

---

**Key Takeaway**: AI FileSense is designed with privacy at its core. Your files never leave your computer, and you maintain complete control over your data at all times.
