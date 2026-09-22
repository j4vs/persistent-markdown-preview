# Changelog

## 1.5.3

- Rewrite the README for public users and move development instructions to CONTRIBUTING.md.
- Link the public GitHub repository, project homepage and issue tracker from the extension metadata.

## 1.5.2

- Set the publisher to `smartsys-mx` and company metadata to Smartsys.

## 1.5.1

- Fix content leaking above sticky code and table headers.
- Use native vertical sticky positioning for tables, synchronizing only column widths and horizontal scrolling to eliminate header jitter.

## 1.5.0

- Add language headers and always-visible copy controls to fenced blocks, with two-second success feedback.
- Highlight declared code languages locally with Highlight.js; preserve plain text for unknown languages.
- Round code blocks and tables, and keep headers visible while scrolling their content.
- Preserve table column alignment during horizontal scrolling and keep Mermaid rendering with source copy.

## 1.4.3

- Slightly reduce heading chevrons and increase their distance from heading text.

## 1.4.2

- Replace heading arrows with vertically centered chevrons in the left gutter, keeping heading text aligned with body text.

## 1.4.1

- Enlarge heading fold icons; expanded sections reveal the icon on heading hover or keyboard focus, while collapsed sections keep it visible.

## 1.4.0

- Place icon-only table copy controls inside the header, revealed on hover/focus with a two-second success check.
- Add live settings for base font size, text font and code font; default to VS Code interface/editor fonts.
- Show the table of contents as a dismissible right sidebar when space permits, otherwise as a menu that closes after navigation.

## 1.3.0

- Restore compact typography at 14 px and a centered 980 px maximum content width.
- Add per-table copy buttons for the original Markdown through the VS Code clipboard.
- Add nested heading folds and a show/hide table of contents with navigation that expands ancestors.
- Persist fold and table-of-contents state independently for each preview.

## 1.2.0

- Fixed dark reading style inspired by AnuPpuccin Mocha (old), using Cascadia Code at 23 px, colorful headings, full-width content and updated spacing.
- Match Mermaid diagrams to the fixed palette and avoid rerendering on editor theme changes.

## 1.1.0

- Render Mermaid code blocks as local SVG diagrams, including flowcharts and sequence diagrams.
- Adapt diagrams to the editor theme and preserve scroll during asynchronous rendering.
- Show source and an inline message for invalid diagrams, without affecting other blocks.
- Bundle Mermaid offline with strict security and third-party license notices.

## 1.0.3

- Start new previews at the Markdown block nearest the editor cursor, only on initial opening. Existing and restored previews retain their independent scroll.

## 1.0.2

- Change preview tab titles to `[Preview] filename`, preserving numbering for multiple previews.

## 1.0.1

- Open new previews as tabs in the active editor group instead of splitting the editor to the side.

## 1.0.0

- Independent previews for saved and Untitled Markdown documents.
- Persistent per-panel scroll, live updates, and webview state restoration.
- Theme-aware Markdown, tables, local images, and restricted link handling.
