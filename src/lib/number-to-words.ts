export const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertToWords = (n: number | string): string => {
    const numValue = typeof n === 'string' ? parseInt(n, 10) : n;
    if (numValue === 0) return '';
    if (numValue < 20) return ones[numValue];
    if (numValue < 100) return tens[Math.floor(numValue / 10)] + (numValue % 10 !== 0 ? '-' + ones[numValue % 10] : '');
    if (numValue < 1000) {
      return ones[Math.floor(numValue / 100)] + ' Hundred' + (numValue % 100 !== 0 ? ' ' + convertToWords(numValue % 100) : '');
    }
    
    const units = [
      { label: 'Crore', value: 10000000, plural: 'Crores' },
      { label: 'Lakh', value: 100000, plural: 'Lakhs' },
      { label: 'Thousand', value: 1000, plural: 'Thousand' }
    ];

    for (const { label, value, plural } of units) {
      if (numValue >= value) {
        const count = Math.floor(numValue / value);
        const remainder = numValue % value;
        const displayLabel = count > 1 ? plural : label;
        return convertToWords(count) + ' ' + displayLabel + (remainder !== 0 ? ' ' + convertToWords(remainder) : '');
      }
    }
    return '';
  };

  const amount = Math.abs(num);
  const rupees = Math.floor(amount);
  const paisa = Math.round((amount - rupees) * 100);

  const rupeesPart = convertToWords(rupees).trim();
  const paisaPart = paisa > 0 ? convertToWords(paisa).trim() : '';

  if (!rupeesPart && !paisaPart) return 'Zero Rupees Only';

  let finalString = '';
  if (rupeesPart) {
    finalString += rupeesPart + ' Rupee' + (rupees !== 1 ? 's' : '');
  }
  
  if (paisaPart) {
    if (rupeesPart) finalString += ' and ';
    finalString += paisaPart + ' Paisa';
  }

  return finalString + ' Only';
};
