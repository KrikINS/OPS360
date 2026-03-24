export function numberToWords(num: number): string {
  if (num === 0) return 'Zero'

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const scales = ['', 'Thousand', 'Lakh', 'Crore']

  function convertChunk(n: number): string {
    let str = ''
    if (n >= 100) {
      str += units[Math.floor(n / 100)] + ' Hundred '
      n %= 100
    }
    if (n >= 10 && n < 20) {
      str += teens[n - 10] + ' '
    } else {
      if (Math.floor(n / 10) > 0) {
        str += tens[Math.floor(n / 10)] + ' '
      }
      if (n % 10 > 0) {
        str += units[n % 10] + ' '
      }
    }
    return str
  }

  let result = ''
  let count = 0
  
  // Format to integer
  let integerPart = Math.floor(num)
  
  // Handle 0 separately for chunking
  if (integerPart === 0) return 'Zero'

  // Chunking for Indian Numbering System (10,00,00,000)
  // 1st chunk is 3 digits, rest are 2 digits
  
  // Last 3 digits
  let chunk = integerPart % 1000
  if (chunk > 0) {
    result = convertChunk(chunk) + result
  }
  integerPart = Math.floor(integerPart / 1000)
  
  while (integerPart > 0) {
    count++
    chunk = integerPart % 100
    if (chunk > 0) {
      result = convertChunk(chunk) + scales[count] + ' ' + result
    }
    integerPart = Math.floor(integerPart / 100)
  }

  return result.trim() + ' Only'
}
