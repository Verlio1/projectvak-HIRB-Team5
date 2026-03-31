export const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+32')) {
        const numbers = cleaned.slice(3);
        let formatted = '+32';
        if (numbers.length > 0) formatted += ' ' + numbers.slice(0, 3);
        if (numbers.length > 3) formatted += ' ' + numbers.slice(3, 5);
        if (numbers.length > 5) formatted += ' ' + numbers.slice(5, 7);
        if (numbers.length > 7) formatted += ' ' + numbers.slice(7, 9);
        return formatted;
    } else if (cleaned.startsWith('0')) {
        let formatted = cleaned.slice(0, 4);
        if (cleaned.length > 4) formatted += ' ' + cleaned.slice(4, 6);
        if (cleaned.length > 6) formatted += ' ' + cleaned.slice(6, 8);
        if (cleaned.length > 8) formatted += ' ' + cleaned.slice(8, 10);
        return formatted;
    }
    return cleaned;
};
