## Data Management 

- As a privacy-conscious user, I want to export all my data to a single JSON file, so I have a portable backup that never touches a server
- As a user, I want to import a JSON backup with a clear replace-vs-merge choice, so I can restore or migrate devices safely
- As a user, I want a "delete all data" action with confirmation, so I can start fresh without digging through dev tools
- As a user, I want the app to request persistent storage, so the browser doesn't silently evict my financial data 
- As a developer, I want every export to record its schema version and the IndexedDB schema to support forward migrations, so old backups keep working after upgrades 
- As a user, I want to import data I have exported previously, and override everything but receive a stern warning when doing so