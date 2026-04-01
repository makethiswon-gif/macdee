// =============================================================================
// Antigravity Blog Image Template Config V5 (Minimalist Webtoon Edition)
// =============================================================================

export type DynamicColor = '{{logo.primary}}' | '{{logo.secondary}}' | '{{logo.accent}}';

export type DynamicText =
  | '{{post.title}}'
  | '{{post.category}}'
  | '{{post.keypoints}}'
  | '{{profile.name}}'
  | '{{profile.title}}'
  | '{{profile.firm}}'
  | '{{profile.phone1}}'
  | '{{profile.phone2}}'
  | '{{profile.phone3}}'
  | '{{profile.address}}'
  | '{{profile.specialties}}'
  | '{{profile.credentials}}'
  | '{{profile.slogan}}'
  | '{{profile.homepage}}';

export type StyleId = 'young' | 'mature' | 'criminal' | 'family' | 'classic';
export type ImageTypeId = 'main' | 'summary' | 'illustration' | 'brand' | 'career' | 'contact';

export interface CanvasConfig {
  width: number;
  height: number;
  format: 'png' | 'jpg';
  quality: number;
}

// ---------------------------------------------------------------------------
// 1. 스타일 장식 및 컬러 프리셋
// ---------------------------------------------------------------------------
export interface StylePreset {
  id: StyleId;
  name: string;
  nameEn: string;
  description: string;
  colors: {
    bg: { primary: string; secondary: string; gradient?: { from: string; to: string; angle: number }; };
    accent: { primary: string; secondary?: string; };
    text: { primary: string; secondary: string; muted: string; onAccent: string; };
    border?: string;
    overlay?: { color: string; opacity: number; }; // V5 is heavily dependent on beautiful black/dark transparent overlays
  };
  typography: {
    titleFont: 'sans' | 'serif';
    titleWeight: 400 | 500 | 600 | 700 | 900;
    bodyFont: 'sans' | 'serif';
    bodyWeight: 400 | 500 | 700;
    categoryLetterSpacing: number;
    categoryTransform: 'uppercase' | 'none';
  };
  decorations: {
    divider?: { width: number; color: string; opacity: number; }; // Only minimal decorations allowed in V5
  };
  cta: {
    variant: 'filled' | 'outlined';
    bgColor: string;
    textColor: string;
    borderRadius: number;
    borderColor?: string;
  };
  logoColorPolicy: {
    overrideAccent: boolean;
    minLuminance?: number;
    maxLuminance?: number;
  };
}

// V5 Presets: Stripped of all garbage scanlines, circles, and boxes. 
// Pure colors, pure typography.
export const STYLE_PRESETS: Record<StyleId, StylePreset> = {
  young: {
    id: 'young', name: '트렌디 다크', nameEn: 'Modern Bold', description: '다크 테마 베이스 미니멀리즘',
    colors: {
      bg: { primary: '#09090b', secondary: '#18181b' },
      accent: { primary: '#3b82f6', secondary: '#60a5fa' },
      text: { primary: '#ffffff', secondary: '#e4e4e7', muted: '#a1a1aa', onAccent: '#ffffff' },
      overlay: { color: '#000000', opacity: 0.85 },
    },
    typography: { titleFont: 'sans', titleWeight: 900, bodyFont: 'sans', bodyWeight: 400, categoryLetterSpacing: 0.05, categoryTransform: 'uppercase' },
    decorations: { divider: { width: 60, color: '{{logo.accent}}', opacity: 1 } },
    cta: { variant: 'filled', bgColor: '{{logo.accent}}', textColor: '#ffffff', borderRadius: 12 },
    logoColorPolicy: { overrideAccent: true, minLuminance: 0.3, maxLuminance: 0.9 },
  },
  mature: {
    id: 'mature', name: '클래식 화이트', nameEn: 'Trust White', description: '화이트 공간을 극대화한 신뢰형',
    colors: {
      bg: { primary: '#ffffff', secondary: '#f8fafc' },
      accent: { primary: '#1e293b', secondary: '#334155' },
      text: { primary: '#0f172a', secondary: '#334155', muted: '#64748b', onAccent: '#ffffff' },
      overlay: { color: '#ffffff', opacity: 0.85 },
    },
    typography: { titleFont: 'serif', titleWeight: 700, bodyFont: 'serif', bodyWeight: 400, categoryLetterSpacing: 0.02, categoryTransform: 'none' },
    decorations: { divider: { width: 40, color: '#1e293b', opacity: 0.2 } },
    cta: { variant: 'outlined', bgColor: 'transparent', textColor: '#1e293b', borderRadius: 4, borderColor: '#1e293b' },
    logoColorPolicy: { overrideAccent: true, minLuminance: 0.1, maxLuminance: 0.6 },
  },
  criminal: {
    id: 'criminal', name: '시네마틱 블랙', nameEn: 'Deep Contrast', description: '가장 강렬한 대비의 극적 테마',
    colors: {
      bg: { primary: '#000000', secondary: '#111111' },
      accent: { primary: '#dc2626', secondary: '#ef4444' },
      text: { primary: '#ffffff', secondary: '#cbd5e1', muted: '#64748b', onAccent: '#ffffff' },
      overlay: { color: '#000000', opacity: 0.90 },
    },
    typography: { titleFont: 'serif', titleWeight: 900, bodyFont: 'sans', bodyWeight: 400, categoryLetterSpacing: 0.1, categoryTransform: 'uppercase' },
    decorations: { divider: { width: 80, color: '#dc2626', opacity: 0.8 } },
    cta: { variant: 'filled', bgColor: '#dc2626', textColor: '#ffffff', borderRadius: 0 },
    logoColorPolicy: { overrideAccent: true, minLuminance: 0.2, maxLuminance: 0.8 },
  },
  family: {
    id: 'family', name: '파스텔 웜', nameEn: 'Warm Ivory', description: '따뜻하고 부드러운 감성 테마',
    colors: {
      bg: { primary: '#fffbeb', secondary: '#fef3c7' },
      accent: { primary: '#d97706', secondary: '#fbbf24' },
      text: { primary: '#451a03', secondary: '#78350f', muted: '#b45309', onAccent: '#ffffff' },
      overlay: { color: '#fffbeb', opacity: 0.80 },
    },
    typography: { titleFont: 'sans', titleWeight: 600, bodyFont: 'sans', bodyWeight: 400, categoryLetterSpacing: 0.0, categoryTransform: 'none' },
    decorations: {},
    cta: { variant: 'filled', bgColor: '{{logo.accent}}', textColor: '#ffffff', borderRadius: 999 },
    logoColorPolicy: { overrideAccent: true, minLuminance: 0.2, maxLuminance: 0.7 },
  },
  classic: {
    id: 'classic', name: '스탠다드 네이비', nameEn: 'Classic Navy', description: '가장 정석적인 로펌 네이비',
    colors: {
      bg: { primary: '#0f172a', secondary: '#1e293b' },
      accent: { primary: '#38bdf8', secondary: '#7dd3fc' },
      text: { primary: '#ffffff', secondary: '#e2e8f0', muted: '#94a3b8', onAccent: '#0f172a' },
      overlay: { color: '#0f172a', opacity: 0.85 },
    },
    typography: { titleFont: 'serif', titleWeight: 600, bodyFont: 'sans', bodyWeight: 400, categoryLetterSpacing: 0.05, categoryTransform: 'none' },
    decorations: { divider: { width: 50, color: '{{logo.accent}}', opacity: 0.5 } },
    cta: { variant: 'filled', bgColor: '{{logo.accent}}', textColor: '#0f172a', borderRadius: 6 },
    logoColorPolicy: { overrideAccent: true, minLuminance: 0.4, maxLuminance: 0.9 },
  },
};

// ---------------------------------------------------------------------------
// 2. 구성 요소 슬롯 (V5)
// ---------------------------------------------------------------------------

export type ImageSourceType = 'office' | 'profile' | 'summary' | 'logo' | 'vibe';
export interface RectConfig { x: number; y: number; w: number; h: number; }

export interface PhotoSlot {
  source: ImageSourceType;
  rect: RectConfig;
  shape: 'rect' | 'circle';
  objectFit: 'cover' | 'contain';
  objectPosition?: 'center' | 'top' | 'bottom';
  borderRadius?: number;
  alpha?: number;
  overlay: 'none' | 'style-default' | 'darken-heavy' | 'lighten';
  overlayDirection?: 'full' | 'bottom' | 'left';
  fallback: 'solid-bg' | 'gradient-bg' | 'empty';
}

export interface TextSlot {
  bind: DynamicText | string;
  role: 'title' | 'category' | 'body' | 'meta' | 'accent' | 'list';
  rect: RectConfig;
  align: 'left' | 'center' | 'right';
  fontSize: number;
  maxLines?: number;
  colorKey: 'primary' | 'secondary' | 'muted' | 'accent' | 'onAccent';
  lineGap?: number;
}

export interface DecoSlot {
  type: 'divider' | 'underline' | 'quote' | 'sidebar' | 'scanlines' | 'orb' | 'circle';
  rect?: RectConfig;
  fromPreset?: boolean;
}

export interface CtaSlot {
  bind: DynamicText | string;
  rect: RectConfig;
  align: 'center' | 'left';
  icon?: 'phone' | 'arrow' | 'chat';
}

export interface ImageTypeTemplate {
  id: ImageTypeId;
  name: string;
  description: string;
  requiredData: DynamicText[];
  aspectRatio: { w: number; h: number };
  layouts: Record<StyleId, {
    photos: PhotoSlot[];
    texts: TextSlot[];
    decos: DecoSlot[];
    cta?: CtaSlot;
  }>;
}

// ---------------------------------------------------------------------------
// 3. 템플릿 레이아웃 (V5: The Minimalist Webtoon Engine)
// ---------------------------------------------------------------------------
// 모든 레이아웃은 DALL-E 배경이나 웹툰 삽화가 전체 1024x1024를 꽉 채우도록(w:1, h:1) 설계.
// 텍스트는 하단이나 중앙 30~50% 영역에 집중되며, 읽기 쉽도록 강력한 하단 그라데이션 오버레이를 적용.

// 공통 풀 스크린 사진 슬롯 생성기
const generateFullScreenPhoto = (source: ImageSourceType): PhotoSlot => ({
  source, rect: { x: 0, y: 0, w: 1, h: 1 }, shape: 'rect', objectFit: 'cover',
  overlay: 'darken-heavy', overlayDirection: 'bottom', fallback: 'solid-bg', alpha: 1.0
});

// 공통 프로필 사진 바디 컷 슬롯 (우측 하단)
const generateMinimalProfile = (): PhotoSlot => ({
  source: 'profile', rect: { x: 0.5, y: 0.2, w: 0.5, h: 0.8 }, shape: 'rect', objectFit: 'cover', objectPosition: 'top',
  overlay: 'none', fallback: 'empty', alpha: 1.0
});

export const MAIN_TEMPLATE: ImageTypeTemplate = {
  id: 'main', name: '메인 커버', description: 'V5 미니멀리즘: 아름다운 풀화면 아트와 하단 타이포그래피',
  requiredData: ['{{post.title}}', '{{profile.firm}}'], aspectRatio: { w: 1, h: 1 },
  layouts: {
    young: {
      photos: [generateFullScreenPhoto('office')], // vibe bg will override office
      texts: [
        { bind: '{{post.category}}', role: 'category', rect: { x: 0.08, y: 0.65, w: 0.84, h: 0.05 }, align: 'left', fontSize: 18, colorKey: 'accent' },
        { bind: '{{post.title}}', role: 'title', rect: { x: 0.08, y: 0.72, w: 0.84, h: 0.16 }, align: 'left', fontSize: 52, maxLines: 2, colorKey: 'primary' },
        { bind: '{{profile.firm}}', role: 'meta', rect: { x: 0.08, y: 0.90, w: 0.84, h: 0.05 }, align: 'left', fontSize: 16, colorKey: 'muted' },
      ], decos: []
    },
    mature: {
      photos: [generateFullScreenPhoto('office'), generateMinimalProfile()], 
      texts: [
        { bind: '{{post.title}}', role: 'title', rect: { x: 0.08, y: 0.68, w: 0.84, h: 0.18 }, align: 'left', fontSize: 48, maxLines: 2, colorKey: 'primary' },
        { bind: '{{profile.firm}} | {{profile.name}}', role: 'meta', rect: { x: 0.08, y: 0.88, w: 0.84, h: 0.05 }, align: 'left', fontSize: 16, colorKey: 'accent' },
      ], decos: []
    },
    criminal: {
      photos: [generateFullScreenPhoto('office')],
      texts: [
        { bind: '{{post.title}}', role: 'title', rect: { x: 0.08, y: 0.40, w: 0.84, h: 0.20 }, align: 'center', fontSize: 56, maxLines: 2, colorKey: 'primary' },
        { bind: '{{post.category}}', role: 'category', rect: { x: 0.08, y: 0.62, w: 0.84, h: 0.05 }, align: 'center', fontSize: 18, colorKey: 'accent' },
      ], decos: [{ type: 'divider', rect: { x: 0.45, y: 0.68, w: 0.1, h: 0 } }]
    },
    family: {
      photos: [generateFullScreenPhoto('office')],
      texts: [
        { bind: '{{post.category}}', role: 'category', rect: { x: 0.08, y: 0.12, w: 0.84, h: 0.05 }, align: 'center', fontSize: 16, colorKey: 'muted' },
        { bind: '{{post.title}}', role: 'title', rect: { x: 0.08, y: 0.18, w: 0.84, h: 0.16 }, align: 'center', fontSize: 44, maxLines: 2, colorKey: 'primary' },
      ], decos: []
    },
    classic: {
      photos: [generateFullScreenPhoto('office')],
      texts: [
        { bind: '{{post.title}}', role: 'title', rect: { x: 0.1, y: 0.70, w: 0.8, h: 0.16 }, align: 'left', fontSize: 46, maxLines: 2, colorKey: 'primary' },
        { bind: '{{profile.firm}}', role: 'meta', rect: { x: 0.1, y: 0.88, w: 0.8, h: 0.05 }, align: 'left', fontSize: 15, colorKey: 'muted' },
      ], decos: [{ type: 'divider', rect: { x: 0.1, y: 0.65, w: 0.1, h: 0 } }]
    }
  }
};

export const SUMMARY_TEMPLATE: ImageTypeTemplate = {
  id: 'summary', name: '요약 포인트', description: '가독성 극대화된 심플 포인트 넘버링',
  requiredData: ['{{post.keypoints}}'], aspectRatio: { w: 1, h: 1 },
  layouts: {
    young: {
      photos: [generateFullScreenPhoto('office')],
      texts: [
        { bind: '핵심 쟁점 요약', role: 'title', rect: { x: 0.1, y: 0.12, w: 0.8, h: 0.08 }, align: 'left', fontSize: 32, colorKey: 'accent' },
        { bind: '{{post.keypoints}}', role: 'list', rect: { x: 0.1, y: 0.25, w: 0.8, h: 0.65 }, align: 'left', fontSize: 22, lineGap: 1.8, colorKey: 'primary' },
      ], decos: []
    },
    mature: {
      photos: [generateFullScreenPhoto('office')],
      texts: [
        { bind: 'Key Points', role: 'category', rect: { x: 0.1, y: 0.1, w: 0.8, h: 0.05 }, align: 'center', fontSize: 16, colorKey: 'accent' },
        { bind: '{{post.keypoints}}', role: 'list', rect: { x: 0.1, y: 0.2, w: 0.8, h: 0.7 }, align: 'center', fontSize: 24, lineGap: 2.0, colorKey: 'primary' },
      ], decos: []
    },
    criminal: {
      photos: [generateFullScreenPhoto('office')],
      texts: [
        { bind: '주의사항 및 핵심', role: 'title', rect: { x: 0.1, y: 0.15, w: 0.8, h: 0.08 }, align: 'left', fontSize: 36, colorKey: 'accent' },
        { bind: '{{post.keypoints}}', role: 'list', rect: { x: 0.1, y: 0.3, w: 0.8, h: 0.6 }, align: 'left', fontSize: 22, lineGap: 1.9, colorKey: 'primary' },
      ], decos: [{ type: 'divider', rect: { x: 0.1, y: 0.26, w: 0.2, h: 0 } }]
    },
    family: {
      photos: [generateFullScreenPhoto('office')],
      texts: [
        { bind: '{{post.keypoints}}', role: 'list', rect: { x: 0.12, y: 0.15, w: 0.76, h: 0.7 }, align: 'left', fontSize: 22, lineGap: 1.9, colorKey: 'primary' },
      ], decos: []
    },
    classic: {
      photos: [generateFullScreenPhoto('office')],
      texts: [
        { bind: 'SUMMARY', role: 'category', rect: { x: 0.1, y: 0.12, w: 0.8, h: 0.05 }, align: 'left', fontSize: 18, colorKey: 'accent' },
        { bind: '{{post.keypoints}}', role: 'list', rect: { x: 0.1, y: 0.25, w: 0.8, h: 0.65 }, align: 'left', fontSize: 22, lineGap: 1.8, colorKey: 'primary' },
      ], decos: []
    }
  }
};

export const ILLUSTRATION_TEMPLATE: ImageTypeTemplate = {
  id: 'illustration', name: '웹툰 일러스트', description: 'Full 100% Canvas Webtoon Art + Minimal Text',
  requiredData: ['{{post.title}}'], aspectRatio: { w: 1, h: 1 },
  layouts: {
    young: {
      photos: [generateFullScreenPhoto('summary')], // 'summary' source points to DALL-E illustrative art
      texts: [
        { bind: '{{post.title}}', role: 'title', rect: { x: 0.05, y: 0.82, w: 0.9, h: 0.12 }, align: 'center', fontSize: 40, maxLines: 2, colorKey: 'primary' },
      ], decos: []
    },
    mature: {
      photos: [generateFullScreenPhoto('summary')],
      texts: [
        { bind: '{{post.title}}', role: 'title', rect: { x: 0.08, y: 0.80, w: 0.84, h: 0.12 }, align: 'left', fontSize: 42, maxLines: 2, colorKey: 'primary' },
      ], decos: []
    },
    criminal: {
      photos: [generateFullScreenPhoto('summary')],
      texts: [
        { bind: '{{post.title}}', role: 'title', rect: { x: 0.1, y: 0.10, w: 0.8, h: 0.15 }, align: 'center', fontSize: 46, maxLines: 2, colorKey: 'primary' },
      ], decos: []
    },
    family: {
      photos: [generateFullScreenPhoto('summary')],
      texts: [
        { bind: '{{post.title}}', role: 'body', rect: { x: 0.1, y: 0.85, w: 0.8, h: 0.10 }, align: 'center', fontSize: 32, maxLines: 2, colorKey: 'primary' },
      ], decos: []
    },
    classic: {
      photos: [generateFullScreenPhoto('summary')],
      texts: [
        { bind: '{{post.title}}', role: 'title', rect: { x: 0.05, y: 0.80, w: 0.9, h: 0.12 }, align: 'center', fontSize: 42, maxLines: 2, colorKey: 'primary' },
      ], decos: []
    }
  }
};

export const BRAND_TEMPLATE: ImageTypeTemplate = {
  id: 'brand', name: '로펌 브랜딩', description: '로고와 슬로건에 시선을 꽂는 웅장한 레이아웃',
  requiredData: ['{{profile.firm}}'], aspectRatio: { w: 1, h: 1 },
  layouts: {
    young: {
      photos: [generateFullScreenPhoto('office')],
      texts: [
        { bind: '{{profile.firm}}', role: 'title', rect: { x: 0.1, y: 0.45, w: 0.8, h: 0.1 }, align: 'center', fontSize: 56, colorKey: 'primary' },
        { bind: '당신의 권리를 위한 최선의 선택', role: 'category', rect: { x: 0.1, y: 0.58, w: 0.8, h: 0.05 }, align: 'center', fontSize: 18, colorKey: 'muted' },
      ], decos: []
    },
    mature: {
      photos: [generateFullScreenPhoto('office')],
      texts: [
        { bind: '{{profile.firm}}', role: 'title', rect: { x: 0.1, y: 0.40, w: 0.8, h: 0.15 }, align: 'center', fontSize: 48, colorKey: 'primary' },
        { bind: 'TRUST & PROFESSIONAL', role: 'category', rect: { x: 0.1, y: 0.55, w: 0.8, h: 0.05 }, align: 'center', fontSize: 16, colorKey: 'accent' },
      ], decos: [{ type: 'divider', rect: { x: 0.45, y: 0.35, w: 0.1, h: 0 } }]
    },
    criminal: {
      photos: [generateFullScreenPhoto('office')],
      texts: [
        { bind: '{{profile.firm}}', role: 'title', rect: { x: 0.1, y: 0.45, w: 0.8, h: 0.1 }, align: 'center', fontSize: 62, colorKey: 'primary' },
      ], decos: []
    },
    family: {
      photos: [generateFullScreenPhoto('office')],
      texts: [
        { bind: '{{profile.firm}}', role: 'title', rect: { x: 0.1, y: 0.45, w: 0.8, h: 0.1 }, align: 'center', fontSize: 44, colorKey: 'primary' },
      ], decos: []
    },
    classic: {
      photos: [generateFullScreenPhoto('office')],
      texts: [
        { bind: '{{profile.firm}}', role: 'title', rect: { x: 0.1, y: 0.45, w: 0.8, h: 0.1 }, align: 'center', fontSize: 50, colorKey: 'primary' },
      ], decos: []
    }
  }
};

export const CAREER_TEMPLATE: ImageTypeTemplate = {
  id: 'career', name: '변호사 이력', description: '미니멀한 이력 나열',
  requiredData: ['{{profile.name}}', '{{profile.credentials}}'], aspectRatio: { w: 1, h: 1 },
  layouts: {
    young: {
      photos: [generateFullScreenPhoto('office'), generateMinimalProfile()],
      texts: [
        { bind: '{{profile.name}} 변호사', role: 'title', rect: { x: 0.08, y: 0.15, w: 0.42, h: 0.1 }, align: 'left', fontSize: 32, colorKey: 'primary' },
        { bind: '{{profile.credentials}}', role: 'body', rect: { x: 0.08, y: 0.35, w: 0.46, h: 0.60 }, align: 'left', fontSize: 16, lineGap: 1.5, colorKey: 'muted' },
      ], decos: []
    },
    mature: {
      photos: [generateFullScreenPhoto('office'), generateMinimalProfile()],
      texts: [
        { bind: '{{profile.name}}', role: 'title', rect: { x: 0.08, y: 0.15, w: 0.42, h: 0.1 }, align: 'left', fontSize: 36, colorKey: 'primary' },
        { bind: '{{profile.credentials}}', role: 'body', rect: { x: 0.08, y: 0.30, w: 0.46, h: 0.60 }, align: 'left', fontSize: 16, lineGap: 1.5, colorKey: 'muted' },
      ], decos: []
    },
    criminal: {
      photos: [generateFullScreenPhoto('office')],
      texts: [
        { bind: '대표변호사 {{profile.name}}', role: 'title', rect: { x: 0.1, y: 0.15, w: 0.8, h: 0.08 }, align: 'center', fontSize: 32, colorKey: 'primary' },
        { bind: '{{profile.credentials}}', role: 'body', rect: { x: 0.1, y: 0.30, w: 0.8, h: 0.60 }, align: 'center', fontSize: 16, lineGap: 1.6, colorKey: 'muted' },
      ], decos: [{ type: 'divider', rect: { x: 0.4, y: 0.25, w: 0.2, h: 0 } }]
    },
    family: {
      photos: [generateFullScreenPhoto('office'), generateMinimalProfile()],
      texts: [
        { bind: '{{profile.name}}', role: 'title', rect: { x: 0.08, y: 0.15, w: 0.42, h: 0.1 }, align: 'left', fontSize: 32, colorKey: 'primary' },
        { bind: '{{profile.credentials}}', role: 'body', rect: { x: 0.08, y: 0.30, w: 0.46, h: 0.65 }, align: 'left', fontSize: 16, lineGap: 1.5, colorKey: 'muted' },
      ], decos: []
    },
    classic: {
      photos: [generateFullScreenPhoto('office'), generateMinimalProfile()],
      texts: [
        { bind: '{{profile.name}} 변호사', role: 'title', rect: { x: 0.08, y: 0.15, w: 0.42, h: 0.1 }, align: 'left', fontSize: 32, colorKey: 'primary' },
        { bind: '{{profile.credentials}}', role: 'body', rect: { x: 0.08, y: 0.30, w: 0.46, h: 0.60 }, align: 'left', fontSize: 16, lineGap: 1.5, colorKey: 'muted' },
      ], decos: []
    }
  }
};

export const CONTACT_TEMPLATE: ImageTypeTemplate = {
  id: 'contact', name: '연락망', description: '100% Canvas with clear CTA',
  requiredData: ['{{profile.phone1}}', '{{profile.firm}}'], aspectRatio: { w: 1, h: 1 },
  layouts: {
    young: {
      photos: [generateFullScreenPhoto('office')],
      texts: [
        { bind: '언제든 문의하세요', role: 'category', rect: { x: 0.1, y: 0.25, w: 0.8, h: 0.05 }, align: 'center', fontSize: 18, colorKey: 'accent' },
        { bind: '{{profile.phone1}}', role: 'title', rect: { x: 0.1, y: 0.35, w: 0.8, h: 0.15 }, align: 'center', fontSize: 60, colorKey: 'primary' },
        { bind: '{{profile.address}}', role: 'body', rect: { x: 0.1, y: 0.55, w: 0.8, h: 0.05 }, align: 'center', fontSize: 16, colorKey: 'muted' },
      ], decos: [],
      cta: { bind: '지금 전화걸기', rect: { x: 0.25, y: 0.75, w: 0.5, h: 0.08 }, align: 'center', icon: 'phone' }
    },
    mature: {
      photos: [generateFullScreenPhoto('office')],
      texts: [
        { bind: '법률 상담 전화', role: 'category', rect: { x: 0.1, y: 0.30, w: 0.8, h: 0.05 }, align: 'center', fontSize: 18, colorKey: 'muted' },
        { bind: '{{profile.phone1}}', role: 'title', rect: { x: 0.1, y: 0.40, w: 0.8, h: 0.15 }, align: 'center', fontSize: 56, colorKey: 'primary' },
      ], decos: [],
      cta: { bind: '상담 예약하기', rect: { x: 0.3, y: 0.65, w: 0.4, h: 0.08 }, align: 'center' }
    },
    criminal: {
      photos: [generateFullScreenPhoto('office')],
      texts: [
        { bind: '긴급 상담', role: 'category', rect: { x: 0.1, y: 0.35, w: 0.8, h: 0.05 }, align: 'center', fontSize: 20, colorKey: 'accent' },
        { bind: '{{profile.phone1}}', role: 'title', rect: { x: 0.1, y: 0.45, w: 0.8, h: 0.15 }, align: 'center', fontSize: 64, colorKey: 'primary' },
      ], decos: [],
      cta: { bind: '즉시 변호사 연결', rect: { x: 0.2, y: 0.70, w: 0.6, h: 0.08 }, align: 'center', icon: 'phone' }
    },
    family: {
      photos: [generateFullScreenPhoto('office')],
      texts: [
        { bind: '편하게 연락주세요', role: 'category', rect: { x: 0.1, y: 0.30, w: 0.8, h: 0.05 }, align: 'center', fontSize: 18, colorKey: 'muted' },
        { bind: '{{profile.phone1}}', role: 'title', rect: { x: 0.1, y: 0.40, w: 0.8, h: 0.15 }, align: 'center', fontSize: 52, colorKey: 'primary' },
      ], decos: [],
      cta: { bind: '전화 상담하기', rect: { x: 0.3, y: 0.65, w: 0.4, h: 0.08 }, align: 'center' }
    },
    classic: {
      photos: [generateFullScreenPhoto('office')],
      texts: [
        { bind: '법률 사무소 {{profile.firm}}', role: 'category', rect: { x: 0.1, y: 0.30, w: 0.8, h: 0.05 }, align: 'center', fontSize: 18, colorKey: 'accent' },
        { bind: '{{profile.phone1}}', role: 'title', rect: { x: 0.1, y: 0.40, w: 0.8, h: 0.15 }, align: 'center', fontSize: 56, colorKey: 'primary' },
      ], decos: [],
      cta: { bind: '상담문의 연결', rect: { x: 0.25, y: 0.65, w: 0.5, h: 0.08 }, align: 'center' }
    }
  }
};
