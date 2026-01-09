export type CurriculumFramework = 'zimsec' | 'cambridge' | 'us_k12';

export interface CurriculumTopic {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  subTopics?: CurriculumTopic[];
  studyResources?: string[]; // URLs or internal references
}

export interface CurriculumMetadata {
  framework: CurriculumFramework;
  version: string;
  topics: CurriculumTopic[];
}

/**
 * In-memory curriculum database with example data
 */
export class CurriculumService {
  private curricula: Map<CurriculumFramework, CurriculumMetadata> = new Map();

  constructor() {
    this.loadDefaultCurricula();
  }

  /**
   * Load default curriculum data (should be from JSON files in production)
   */
  private loadDefaultCurricula(): void {
    // ZIMSEC (Zimbabwe)
    this.curricula.set('zimsec', {
      framework: 'zimsec',
      version: '1.0',
      topics: [
        {
          id: 'zimsec-eng-lit',
          name: 'English Literature',
          description: 'ZIMSEC English Literature curriculum',
          keywords: ['literature', 'english', 'poetry', 'prose', 'drama'],
          subTopics: [
            {
              id: 'shakespeare',
              name: 'Shakespeare',
              description: 'Study of Shakespearean texts',
              keywords: ['shakespeare', 'hamlet', 'macbeth', 'othello'],
            },
          ],
        },
        {
          id: 'zimsec-math',
          name: 'Mathematics',
          description: 'ZIMSEC Mathematics curriculum',
          keywords: ['math', 'algebra', 'geometry', 'calculus', 'probability'],
        },
      ],
    });

    // Cambridge International Examinations
    this.curricula.set('cambridge', {
      framework: 'cambridge',
      version: '1.0',
      topics: [
        {
          id: 'cambridge-igcse-eng',
          name: 'IGCSE English',
          description: 'Cambridge IGCSE English Language',
          keywords: ['english', 'language', 'writing', 'reading', 'speaking'],
        },
        {
          id: 'cambridge-math',
          name: 'IGCSE Mathematics',
          description: 'Cambridge IGCSE Mathematics',
          keywords: ['math', 'algebra', 'geometry', 'trigonometry'],
        },
      ],
    });

    // US K-12
    this.curricula.set('us_k12', {
      framework: 'us_k12',
      version: '1.0',
      topics: [
        {
          id: 'us-ela',
          name: 'English Language Arts',
          description: 'US K-12 ELA standards',
          keywords: ['reading', 'writing', 'speaking', 'listening', 'grammar'],
        },
        {
          id: 'us-math',
          name: 'Mathematics',
          description: 'US K-12 Math standards',
          keywords: ['arithmetic', 'algebra', 'geometry', 'statistics'],
        },
        {
          id: 'us-science',
          name: 'Science',
          description: 'US K-12 Science standards',
          keywords: ['biology', 'chemistry', 'physics', 'earth science'],
        },
      ],
    });
  }

  /**
   * Find related curriculum topics for a keyword
   */
  public findRelatedTopics(framework: CurriculumFramework, keyword: string): CurriculumTopic[] {
    const metadata = this.curricula.get(framework);
    if (!metadata) {
      return [];
    }

    const results: CurriculumTopic[] = [];
    const keywordLower = keyword.toLowerCase();

    const searchTopics = (topics: CurriculumTopic[]): void => {
      for (const topic of topics) {
        if (topic.keywords.some(k => k.toLowerCase().includes(keywordLower))) {
          results.push(topic);
        }
        if (topic.subTopics) {
          searchTopics(topic.subTopics);
        }
      }
    };

    searchTopics(metadata.topics);
    return results;
  }

  /**
   * Get all frameworks
   */
  public getFrameworks(): CurriculumFramework[] {
    return Array.from(this.curricula.keys());
  }

  /**
   * Get metadata for a framework
   */
  public getFrameworkMetadata(framework: CurriculumFramework): CurriculumMetadata | undefined {
    return this.curricula.get(framework);
  }
}
