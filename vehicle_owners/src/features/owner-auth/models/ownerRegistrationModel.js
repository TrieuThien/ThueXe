/**
 * @typedef {Object} OwnerRegistrationFormValues
 * @property {string} fullName
 * @property {string} phoneNumber
 * @property {string} email
 * @property {string} address
 * @property {string} password
 * @property {string} confirmPassword
 * @property {string} bankName
 * @property {string} bankAccountNumber
 * @property {string} bankCode
 * @property {string} swiftCode
 * @property {boolean} agreeTerms
 */

/**
 * @type {OwnerRegistrationFormValues}
 */
export const ownerRegistrationDefaultValues = {
  fullName: '',
  phoneNumber: '',
  email: '',
  address: '',
  password: '',
  confirmPassword: '',
  bankName: '',
  bankAccountNumber: '',
  bankCode: '',
  swiftCode: '',
  agreeTerms: false,
};

export const mapOwnerRegistrationPayload = (values) => ({
  fullName: values.fullName.trim(),
  phoneNumber: values.phoneNumber.trim(),
  email: values.email.trim().toLowerCase(),
  address: values.address.trim(),
  password: values.password,
  bankInfo: {
    bankName: values.bankName.trim(),
    accountNumber: values.bankAccountNumber.trim(),
    bankCode: values.bankCode.trim().toUpperCase(),
    swiftCode: values.swiftCode.trim().toUpperCase(),
  },
});
