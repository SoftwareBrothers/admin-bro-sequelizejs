export default function isPostgres(): boolean {
  return process.env.DATABASE_DIALECT === 'postgres'
}
