export const COUNTRIES = [
    { code: "vn", name: "Vietnam", dialCode: "+84", flag: "🇻🇳", phonePlaceholder: "901234567" },
    { code: "us", name: "United States", dialCode: "+1", flag: "🇺🇸", phonePlaceholder: "2025550123" },
    { code: "ca", name: "Canada", dialCode: "+1", flag: "🇨🇦", phonePlaceholder: "4165550199" },
    { code: "gb", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧", phonePlaceholder: "7700900123" },
    { code: "au", name: "Australia", dialCode: "+61", flag: "🇦🇺", phonePlaceholder: "412345678" },
    { code: "sg", name: "Singapore", dialCode: "+65", flag: "🇸🇬", phonePlaceholder: "81234567" },
    { code: "th", name: "Thailand", dialCode: "+66", flag: "🇹🇭", phonePlaceholder: "812345678" },
    { code: "my", name: "Malaysia", dialCode: "+60", flag: "🇲🇾", phonePlaceholder: "123456789" },
    { code: "id", name: "Indonesia", dialCode: "+62", flag: "🇮🇩", phonePlaceholder: "8123456789" },
    { code: "ph", name: "Philippines", dialCode: "+63", flag: "🇵🇭", phonePlaceholder: "9171234567" },
    { code: "in", name: "India", dialCode: "+91", flag: "🇮🇳", phonePlaceholder: "9876543210" },
    { code: "jp", name: "Japan", dialCode: "+81", flag: "🇯🇵", phonePlaceholder: "9012345678" },
    { code: "kr", name: "South Korea", dialCode: "+82", flag: "🇰🇷", phonePlaceholder: "1012345678" },
    { code: "cn", name: "China", dialCode: "+86", flag: "🇨🇳", phonePlaceholder: "13800138000" },
    { code: "fr", name: "France", dialCode: "+33", flag: "🇫🇷", phonePlaceholder: "612345678" },
    { code: "de", name: "Germany", dialCode: "+49", flag: "🇩🇪", phonePlaceholder: "15123456789" },
    { code: "nl", name: "Netherlands", dialCode: "+31", flag: "🇳🇱", phonePlaceholder: "612345678" },
    { code: "es", name: "Spain", dialCode: "+34", flag: "🇪🇸", phonePlaceholder: "612345678" },
    { code: "it", name: "Italy", dialCode: "+39", flag: "🇮🇹", phonePlaceholder: "3123456789" },
    { code: "ae", name: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪", phonePlaceholder: "501234567" },
    { code: "sa", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦", phonePlaceholder: "512345678" },
    { code: "ng", name: "Nigeria", dialCode: "+234", flag: "🇳🇬", phonePlaceholder: "8012345678" },
];

export const DEFAULT_COUNTRY_CODE = "vn";

export function findCountryByCode(code) {
    return COUNTRIES.find((country) => country.code === code) || COUNTRIES[0];
}
