import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import vi from "./locales/vi/common.json";
import en from "./locales/en/common.json";

const savedLang = localStorage.getItem("thuexe_lang") || "vi";

i18n.use(initReactI18next).init({
    resources: {
        vi: { translation: vi },
        en: { translation: en },
    },
    lng: savedLang,
    fallbackLng: "en",
    interpolation: {
        escapeValue: false,
    },
});

i18n.on("languageChanged", (lng) => {
    localStorage.setItem("thuexe_lang", lng);
});

export default i18n;
