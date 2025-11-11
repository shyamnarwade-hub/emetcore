# EmetCore 

A neat, responsive React app using Material UI and AG Grid to upload Excel/CSV files and view data with column selection and pagination.

## Features

- Upload .xlsx/.xls/.csv and parse on-device (SheetJS)
- AG Grid with client-side pagination and column resizing
- Column chooser to show/hide columns (default shows first 8)
- Responsive layout with MUI and flexible height grid
- Theme toggle (light/dark), clear data, template CSV download

## Run locally

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Open the dev URL printed in the terminal (default http://localhost:5173).

## Notes

- Large files: limited to ~15MB to keep UX smooth. You can raise `MAX_FILE_SIZE_MB` in `src/components/FileUploader.tsx`.
- CSV delimiter detection relies on SheetJS; ensure the header row exists for accurate column detection.
- If many columns exist, use the Visible columns selector to pick additional fields.
