export class GeneralHelpers {
  static isValidEmail(email: string) {
    // Regular expression for a basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailRegex.test(email);
  }

  static isPhone(email: string) {
    // Regular expression for a basic phone validation
    const phoneRegex =
      /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im;

    return phoneRegex.test(email);
  }
}
