# NoteSpark

Advanced mini notes application built for the assignment using `Next.js`, `MongoDB`, and `Mongoose`.

## Features

- Create notes with title and description
- Read all notes with created date
- Update existing notes
- Delete notes with immediate UI refresh
- Search notes by title
- Loading states for fetch, create, update, and delete flows
- Responsive polished UI

## Tech Stack

- Next.js App Router
- MongoDB Atlas or any MongoDB deployment
- Mongoose
- Zod validation

## Local Setup

1. Install dependencies:

```powershell
npm install
```

2. Create `.env.local`:

```env
MONGODB_URI=your-mongodb-connection-string
```

3. Start the app:

```powershell
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Deployment

Deploy on Vercel and add the same `MONGODB_URI` environment variable in project settings before production use.
