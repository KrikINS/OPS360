const fs = require('fs')

let content = fs.readFileSync('src/app/actions/service.ts', 'utf8')
content = content.replace(/\r\n/g, '\n')

content = content.replace(
  'import { authOptions } from "@/lib/auth"',
  'import { authOptions } from "@/lib/auth"\nimport { hasCapability } from "@/lib/access"'
)

content = content.replace(
  `export async function searchPosCustomersAction(searchTerm: string) {
  try {`,
  `export async function searchPosCustomersAction(searchTerm: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !(await hasCapability("service", "view", session))) {
    return { error: { message: 'Unauthorized' } }
  }
  try {`
)

content = content.replace(
  `export async function searchProductsAction(searchTerm: string) {
  try {`,
  `export async function searchProductsAction(searchTerm: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !(await hasCapability("service", "view", session))) {
    return { error: { message: 'Unauthorized' } }
  }
  try {`
)

fs.writeFileSync('src/app/actions/service.ts', content)
console.log('Patched app actions')
