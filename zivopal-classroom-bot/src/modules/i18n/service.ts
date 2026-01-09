import { logger } from '../../logger';

export type Language = 'en' | 'sn';

export interface I18nStrings {
  [key: string]: string;
}

/**
 * Internationalization service
 */
export class I18nService {
  private translations: Map<Language, I18nStrings> = new Map();

  constructor() {
    this.loadTranslations();
  }

  /**
   * Load translation files (in production, from JSON)
   */
  private loadTranslations(): void {
    // English translations
    this.translations.set('en', {
      'welcome': 'Welcome to ZivoPal Classroom Bot',
      'message_approved': 'Your message has been approved.',
      'message_deleted': 'Your message was deleted due to a policy violation.',
      'warning_issued': 'You have received a warning for a policy violation.',
      'student_muted': 'You have been muted for {{duration}} hours.',
      'mute_lifted': 'You have been unmuted.',
      'assignment_due_soon': 'Assignment "{{assignmentName}}" is due in {{hoursLeft}} hours.',
      'submission_received': 'We received your submission for {{assignmentName}}. Thank you!',
      'teacher_notification_warning': '{{studentName}} has received a warning for {{reason}}.',
      'teacher_notification_mute': '{{studentName}} has been muted for {{duration}} hours.',
      'help_message': 'I can help with:\n- Answering curriculum questions\n- Tracking assignments\n- Engagement insights',
      'error_generic': 'Sorry, an error occurred. Please try again.',
      'session_timeout': 'Your session has timed out. Please authenticate again.',
      'invalid_input': 'Invalid input. Please check and try again.',
    });

    // Shona translations
    this.translations.set('sn', {
      'welcome': 'Karibitswa kuZivoPal Classroom Bot',
      'message_approved': 'Shoko rako rwazvimirira.',
      'message_deleted': 'Shoko rako rakadezerwa nekuda kwokuvinga hunhu hwechikoro.',
      'warning_issued': 'Watakura murango rwokuvinga hunhu hwechikoro.',
      'student_muted': 'Wakamiswa kunzira kwe {{duration}} maawa.',
      'mute_lifted': 'Wabudirira kunzira.',
      'assignment_due_soon': 'Basa {{assignmentName}} raripo nemumaawa {{hoursLeft}}.',
      'submission_received': 'Takaedza basa rako {{assignmentName}}. Zikanaka!',
      'teacher_notification_warning': '{{studentName}} watakura murango rwokuvinga hunhu {{reason}}.',
      'teacher_notification_mute': '{{studentName}} wakamiswa kunzira kwe {{duration}} maawa.',
      'help_message': 'Ndingabatsira nezve:\n- Mibvunzo yeMunzvimbo Yokudzidza\n- Kurima Mabasa\n- Zivo Zvechikoro',
      'error_generic': 'Ndapindira mhosva. Ndimirire zvakare.',
      'session_timeout': 'Mhuri yako yakadzima. Shanduka zvakare.',
      'invalid_input': 'Kuedza kwakasarudzika. Cherechesa uye usvirire.',
    });
  }

  /**
   * Translate a key with optional interpolation
   */
  public t(key: string, language: Language = 'en', variables?: Record<string, string>): string {
    const lang = this.translations.get(language) || this.translations.get('en');
    if (!lang) {
      return key;
    }

    let text = lang[key] || key;

    if (variables) {
      for (const [varKey, varValue] of Object.entries(variables)) {
        text = text.replace(`{{${varKey}}}`, varValue);
      }
    }

    return text;
  }

  /**
   * Get all supported languages
   */
  public getSupportedLanguages(): Language[] {
    return Array.from(this.translations.keys());
  }

  /**
   * Check if a language is supported
   */
  public isLanguageSupported(language: string): language is Language {
    return this.translations.has(language as Language);
  }

  /**
   * Add custom translation
   */
  public addTranslation(language: Language, key: string, value: string): void {
    const lang = this.translations.get(language);
    if (lang) {
      lang[key] = value;
      logger.debug({ language, key }, 'Translation added');
    }
  }
}
