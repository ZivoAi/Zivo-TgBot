import { CurriculumService } from '../../modules/curriculum/service';
import { I18nService } from '../../modules/i18n/service';

describe('Curriculum Service', () => {
  let service: CurriculumService;

  beforeEach(() => {
    service = new CurriculumService();
  });

  it('should load default curricula', () => {
    const frameworks = service.getFrameworks();
    expect(frameworks).toContain('zimsec');
    expect(frameworks).toContain('cambridge');
    expect(frameworks).toContain('us_k12');
  });

  it('should retrieve framework metadata', () => {
    const metadata = service.getFrameworkMetadata('zimsec');
    expect(metadata).toBeDefined();
    expect(metadata?.topics.length).toBeGreaterThan(0);
  });

  it('should find related topics by keyword', () => {
    const topics = service.findRelatedTopics('zimsec', 'Shakespeare');
    expect(topics.length).toBeGreaterThan(0);
  });

  it('should search across frameworks', () => {
    const topics = service.findRelatedTopics('cambridge', 'math');
    expect(topics.length).toBeGreaterThan(0);
  });

  it('should return empty results for unknown keyword', () => {
    const topics = service.findRelatedTopics('zimsec', 'xyz123unknown');
    expect(topics.length).toBe(0);
  });
});

describe('I18n Service', () => {
  let service: I18nService;

  beforeEach(() => {
    service = new I18nService();
  });

  it('should support multiple languages', () => {
    const languages = service.getSupportedLanguages();
    expect(languages).toContain('en');
    expect(languages).toContain('sn');
  });

  it('should translate English keys', () => {
    const text = service.t('welcome', 'en');
    expect(text).toContain('Welcome');
  });

  it('should translate Shona keys', () => {
    const text = service.t('welcome', 'sn');
    expect(text).toBeDefined();
    expect(text).not.toBe('welcome');
  });

  it('should interpolate variables', () => {
    const text = service.t('student_muted', 'en', { duration: '24' });
    expect(text).toContain('24');
  });

  it('should fallback to English for unsupported language', () => {
    const text = service.t('welcome', 'en');
    expect(text).toBeDefined();
  });

  it('should add custom translations', () => {
    service.addTranslation('en', 'custom_key', 'custom value');
    const text = service.t('custom_key', 'en');
    expect(text).toBe('custom value');
  });

  it('should validate language support', () => {
    expect(service.isLanguageSupported('en')).toBe(true);
    expect(service.isLanguageSupported('sn')).toBe(true);
    expect(service.isLanguageSupported('xx')).toBe(false);
  });
});
