// =============================================================================
// Antigravity Blog Image Template Config
// 5 Styles × 5 Image Types = 25 Templates
// =============================================================================

// ---------------------------------------------------------------------------
// 1. 타입 정의
// ---------------------------------------------------------------------------

/** 로고에서 추출된 컬러를 기반으로 런타임에 결정되는 값 */
export type DynamicColor = '{{logo.primary}}' | '{{logo.secondary}}' | '{{logo.accent}}';

/** 프로필 데이터에서 바인딩되는 텍스트 */
export type DynamicText =
  | '{{post.title}}'
  | '{{post.category}}'
  | '{{post.keypoints}}'       // 핵심 포인트 배열
  | '{{profile.name}}'
  | '{{profile.title}}'        // 직책
  | '{{profile.firm}}'
  | '{{profile.phone1}}'
  | '{{profile.phone2}}'
  | '{{profile.phone3}}'
  | '{{profile.address}}'
  | '{{profile.specialties}}'  // 전문 분야 배열
  | '{{profile.credentials}}'  // 약력 배열
  | '{{profile.slogan}}'
  | '{{profile.homepage}}';

export type StyleId = 'young' | 'mature' | 'criminal' | 'family' | 'classic';
export type ImageTypeId = 'main' | 'summary' | 'brand' | 'career' | 'contact';

export interface CanvasConfig {
  width: number;
  height: number;
  format: 'png' | 'jpg';
  quality: number;
}

// ---------------------------------------------------------------------------
// 2. 스타일 프리셋 (5가지)
// ---------------------------------------------------------------------------

export interface StylePreset {
  id: StyleId;
  name: string;
  nameEn: string;
  description: string;

  /** 컬러 시스템 — 로고 컬러로 오버라이드 가능한 슬롯 포함 */
  colors: {
    bg: {
      primary: string;
      secondary: string;
      gradient?: { from: string; to: string; angle: number };
    };
    accent: {
      primary: string;       // 주 포인트 컬러 (골드바, 네온, 레드 등)
      secondary?: string;    // 보조 포인트 (그래디언트 짝)
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
      onAccent: string;      // 악센트 배경 위 텍스트
    };
    border?: string;
    overlay?: {               // 사진 위 오버레이
      color: string;
      opacity: number;
    };
  };

  /** 타이포그래피 */
  typography: {
    titleFont: 'sans' | 'serif';
    titleWeight: 400 | 500 | 600 | 700 | 900;
    bodyFont: 'sans' | 'serif';
    bodyWeight: 400 | 500 | 700;
    categoryLetterSpacing: number;  // em 단위
    categoryTransform: 'uppercase' | 'none';
  };

  /** 장식 요소 */
  decorations: {
    sideBar?: {
      position: 'left' | 'top' | 'right' | 'bottom';
      width: number;         // px
      color: string;
    };
    innerFrame?: {
      inset: number;         // px
      borderWidth: number;
      borderColor: string;
      borderRadius: number;
    };
    scanlines?: boolean;
    circleAccents?: {
      count: number;
      color: string;
      opacity: number;
    };
    divider?: {
      width: number;
      color: string;
      opacity: number;
    };
    gradientOrbs?: Array<{
      x: number;             // % 기준
      y: number;
      size: number;
      color: string;
      opacity: number;
    }>;
  };

  /** CTA 버튼 스타일 */
  cta: {
    variant: 'filled' | 'outlined';
    bgColor: string;
    textColor: string;
    borderRadius: number;
    borderColor?: string;
  };

  /** 로고 컬러 오버라이드 정책 */
  logoColorPolicy: {
    /** 로고 추출 컬러가 악센트를 대체하는지 */
    overrideAccent: boolean;
    /** 대체 시 밝기 보정 범위 (다크 배경에 너무 어두운 로고컬러 방지) */
    minLuminance?: number;
    maxLuminance?: number;
  };
}

export const STYLE_PRESETS: Record<StyleId, StylePreset> = {

  // ─── 01. 젊고 감각적인 ───────────────────────────────────────────
  young: {
    id: 'young',
    name: '젊고 감각적인',
    nameEn: 'Modern Bold',
    description: '다크 배경 + 네온 그래디언트. 개인회생, 교통사고, 스타트업 법무 등 젊은 타겟',
    colors: {
      bg: {
        primary: '#0D0D0D',
        secondary: '#1A1A2E',
        gradient: { from: '#0D0D0D', to: '#1A1A2E', angle: 135 },
      },
      accent: {
        primary: '#00D2FF',
        secondary: '#7B61FF',
      },
      text: {
        primary: '#FFFFFF',
        secondary: 'rgba(255,255,255,0.8)',
        muted: 'rgba(255,255,255,0.45)',
        onAccent: '#FFFFFF',
      },
      overlay: { color: '#0D0D0D', opacity: 0.6 },
    },
    typography: {
      titleFont: 'sans',
      titleWeight: 900,
      bodyFont: 'sans',
      bodyWeight: 400,
      categoryLetterSpacing: 0.12,
      categoryTransform: 'uppercase',
    },
    decorations: {
      gradientOrbs: [
        { x: 85, y: 10, size: 80, color: '#00D2FF', opacity: 0.5 },
        { x: 70, y: 30, size: 40, color: '#FF6B6B', opacity: 0.35 },
      ],
    },
    cta: {
      variant: 'filled',
      bgColor: 'linear-gradient(135deg, #00D2FF, #7B61FF)',
      textColor: '#FFFFFF',
      borderRadius: 8,
    },
    logoColorPolicy: {
      overrideAccent: true,
      minLuminance: 0.4,
    },
  },

  // ─── 02. 중후하고 보수적인 ───────────────────────────────────────
  mature: {
    id: 'mature',
    name: '중후하고 보수적인',
    nameEn: 'Authoritative Serif',
    description: '딥 네이비 + 골드. 기업자문, 조세, 대형 로펌 등 신뢰가 핵심인 분야',
    colors: {
      bg: {
        primary: '#1B2838',
        secondary: '#2A3D55',
      },
      accent: {
        primary: '#C9A96E',
      },
      text: {
        primary: '#E8E0D0',
        secondary: 'rgba(232,224,208,0.8)',
        muted: 'rgba(232,224,208,0.45)',
        onAccent: '#1B2838',
      },
      overlay: { color: '#1B2838', opacity: 0.5 },
    },
    typography: {
      titleFont: 'serif',
      titleWeight: 700,
      bodyFont: 'sans',
      bodyWeight: 400,
      categoryLetterSpacing: 0.15,
      categoryTransform: 'uppercase',
    },
    decorations: {
      sideBar: {
        position: 'left',
        width: 4,
        color: '#C9A96E',
      },
      divider: { width: 40, color: '#C9A96E', opacity: 0.5 },
    },
    cta: {
      variant: 'outlined',
      bgColor: 'transparent',
      textColor: '#C9A96E',
      borderRadius: 4,
      borderColor: 'rgba(201,169,110,0.4)',
    },
    logoColorPolicy: {
      overrideAccent: false,   // 골드 고정이 브랜드 무드에 맞음
    },
  },

  // ─── 03. 냉철한 형사 ─────────────────────────────────────────────
  criminal: {
    id: 'criminal',
    name: '냉철한 형사',
    nameEn: 'Sharp Noir',
    description: '퓨어블랙 + 크림슨. 성범죄, 마약, 음주운전 등 긴급하고 심각한 사안',
    colors: {
      bg: {
        primary: '#0A0A0A',
        secondary: '#1A1A1A',
      },
      accent: {
        primary: '#C62828',
      },
      text: {
        primary: '#E0E0E0',
        secondary: 'rgba(224,224,224,0.8)',
        muted: 'rgba(224,224,224,0.4)',
        onAccent: '#FFFFFF',
      },
      overlay: { color: '#0A0A0A', opacity: 0.7 },
    },
    typography: {
      titleFont: 'sans',
      titleWeight: 700,
      bodyFont: 'sans',
      bodyWeight: 400,
      categoryLetterSpacing: 0.2,
      categoryTransform: 'uppercase',
    },
    decorations: {
      sideBar: {
        position: 'top',
        width: 3,
        color: '#C62828',
      },
      scanlines: true,
    },
    cta: {
      variant: 'filled',
      bgColor: '#C62828',
      textColor: '#FFFFFF',
      borderRadius: 4,
    },
    logoColorPolicy: {
      overrideAccent: true,
      minLuminance: 0.3,
      maxLuminance: 0.6,      // 너무 밝은 컬러는 형사 무드 깨짐
    },
  },

  // ─── 04. 따뜻한 이혼·상속 ────────────────────────────────────────
  family: {
    id: 'family',
    name: '따뜻한 이혼·상속',
    nameEn: 'Warm Gentle',
    description: '핀터레스트 웜토프(Taupe) 에디토리얼 룩. 상아색(Bone White) 바탕에 우아한 명조체 조화',
    colors: {
      bg: {
        primary: '#FDFCF9',
        secondary: '#F1EFE9',
        gradient: { from: '#FDFCF9', to: '#F1EFE9', angle: 160 },
      },
      accent: {
        primary: '#A89E97',   // 차분하고 따뜻한 회갈색(Muted Taupe)
        secondary: '#8F8680',
      },
      text: {
        primary: '#3B3633',   // 너무 까맣지 않은 부드러운 에스프레소 브라운
        secondary: 'rgba(59,54,51,0.7)',
        muted: 'rgba(59,54,51,0.4)',
        onAccent: '#FFFFFF',
      },
      overlay: { color: '#F1EFE9', opacity: 0.55 },
    },
    typography: {
      titleFont: 'serif',
      titleWeight: 400,       // 묵직하지 않게 우아한 두께 (가벼움)
      bodyFont: 'sans',
      bodyWeight: 400,
      categoryLetterSpacing: 0.25,  // 넓은 자간으로 고급스러운 느낌 극대화
      categoryTransform: 'uppercase', // 영문일 경우 대문자화
    },
    decorations: {
      innerFrame: {
        borderColor: 'rgba(168,158,151,0.3)',
        borderWidth: 1,       // 극강의 얇고 섬세한 1px 단일 액자선
        inset: 40,
        borderRadius: 0,
      },
      divider: { width: 40, color: '#A89E97', opacity: 0.8 },
    },
    cta: {
      variant: 'outlined',
      bgColor: 'transparent',
      textColor: '#A89E97',
      borderRadius: 0,
      borderColor: 'rgba(168,158,151,0.3)',
    },
    logoColorPolicy: {
      overrideAccent: true,
      minLuminance: 0.3,
      maxLuminance: 0.6,
    },
  },

  // ─── 05. 전통적인 로펌 ───────────────────────────────────────────
  classic: {
    id: 'classic',
    name: '전통적인 로펌',
    nameEn: 'Classic Balanced',
    description: '로열블루 + 골드 중앙 정렬. 부동산, 건설, 행정 등 종합 법무법인',
    colors: {
      bg: {
        primary: '#0C1F3F',
        secondary: '#162D54',
        gradient: { from: '#0C1F3F', to: '#162D54', angle: 180 },
      },
      accent: {
        primary: '#C6A96E',
      },
      text: {
        primary: '#E8DFD0',
        secondary: 'rgba(232,223,208,0.8)',
        muted: 'rgba(232,223,208,0.45)',
        onAccent: '#0C1F3F',
      },
      overlay: { color: '#0C1F3F', opacity: 0.6 },
    },
    typography: {
      titleFont: 'serif',
      titleWeight: 700,
      bodyFont: 'sans',
      bodyWeight: 400,
      categoryLetterSpacing: 0.2,
      categoryTransform: 'uppercase',
    },
    decorations: {
      innerFrame: {
        inset: 40,
        borderWidth: 1,
        borderColor: 'rgba(198,169,110,0.3)',
        borderRadius: 2,
      },
      divider: { width: 40, color: '#C6A96E', opacity: 0.4 },
    },
    cta: {
      variant: 'outlined',
      bgColor: 'transparent',
      textColor: '#C6A96E',
      borderRadius: 4,
      borderColor: 'rgba(198,169,110,0.35)',
    },
    logoColorPolicy: {
      overrideAccent: false,
    },
  },
};


// ---------------------------------------------------------------------------
// 3. 이미지 타입별 레이아웃 템플릿 (5가지)
// ---------------------------------------------------------------------------

export interface Rect {
  x: number;    // 0~1
  y: number;    // 0~1
  w: number;    // 0~1
  h: number;    // 0~1
}

export interface TextSlot {
  bind: DynamicText | string;
  role: 'title' | 'subtitle' | 'category' | 'body' | 'label' | 'meta';
  rect: Rect;
  align: 'left' | 'center' | 'right';
  maxLines?: number;
  fontSize: number;            // pt — 1080px 기준
  fontOverride?: {
    font?: 'sans' | 'serif';
    weight?: number | string;
  };
  colorKey: 'primary' | 'secondary' | 'muted' | 'accent' | 'onAccent';
  styleObj?: any; // 추가적인 스타일 조정(예: 하이라이트 등)
}

export interface PhotoSlot {
  source: 'profile' | 'office' | 'logo';
  rect: Rect;
  shape: 'rect' | 'circle';
  objectFit: 'cover' | 'contain';
  borderRadius?: number;       // px — 0이면 직각
  overlay: 'style-default' | 'gradient-bottom' | 'darken-heavy' | 'lighten' | 'none';
  overlayDirection?: 'bottom' | 'left' | 'right' | 'full';
  fallback: 'solid-bg' | 'gradient-bg' | 'pattern';
  alpha?: number; // fallback for basic transparency
}

export interface DecoSlot {
  type: 'sidebar' | 'frame' | 'scanlines' | 'circle' | 'orb' | 'divider' | 'underline';
  rect?: Rect;
  fromPreset?: boolean;
}

export interface CtaSlot {
  text: string;
  rect: Rect;
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
// 3-1. 메인 대표 (Main Thumbnail)
// ---------------------------------------------------------------------------

export const MAIN_TEMPLATE: ImageTypeTemplate = {
  id: 'main',
  name: '메인 대표',
  description: '블로그 대표 썸네일. 네이버 피드 첫 노출 이미지. 제목 + 프로필 + 분야 태그',
  requiredData: ['{{post.title}}', '{{post.category}}', '{{profile.firm}}'],
  aspectRatio: { w: 1, h: 1 },

  layouts: {
    young: {
      photos: [
        {
          source: 'office',
          rect: { x: 0, y: 0, w: 1, h: 1 },
          shape: 'rect', objectFit: 'cover',
          overlay: 'darken-heavy', overlayDirection: 'full', fallback: 'solid-bg', alpha: 0.15
        },
        {
          source: 'profile',
          rect: { x: 0.0, y: 0.25, w: 0.50, h: 0.75 },
          shape: 'rect', objectFit: 'cover',
          overlay: 'none',
          fallback: 'solid-bg',
        },
      ],
      texts: [
        { bind: '{{post.category}}', role: 'category', rect: { x: 0.50, y: 0.68, w: 0.46, h: 0.06 }, align: 'left', fontSize: 18, colorKey: 'accent' },
        { bind: '{{post.title}}', role: 'title', rect: { x: 0.50, y: 0.74, w: 0.46, h: 0.18 }, align: 'left', fontSize: 48, maxLines: 2, colorKey: 'primary' },
        { bind: '{{profile.firm}}', role: 'meta', rect: { x: 0.50, y: 0.94, w: 0.46, h: 0.04 }, align: 'left', fontSize: 14, colorKey: 'muted' },
      ],
      decos: [
        { type: 'orb', fromPreset: true },
        { type: 'underline', rect: { x: 0.50, y: 0.73, w: 0.06, h: 0 } },
      ],
    },
    mature: {
      photos: [
        {
          source: 'office',
          rect: { x: 0, y: 0, w: 1, h: 1 },
          shape: 'rect', objectFit: 'cover',
          overlay: 'style-default', fallback: 'solid-bg', alpha: 0.2
        },
        {
          source: 'profile',
          rect: { x: 0.55, y: 0, w: 0.45, h: 1 },
          shape: 'rect', objectFit: 'cover',
          overlay: 'style-default',
          fallback: 'solid-bg',
        },
      ],
      texts: [
        { bind: '{{profile.firm}}', role: 'category', rect: { x: 0.04, y: 0.10, w: 0.46, h: 0.05 }, align: 'left', fontSize: 15, colorKey: 'accent' },
        { bind: '{{post.title}}', role: 'title', rect: { x: 0.04, y: 0.22, w: 0.46, h: 0.30 }, align: 'left', fontSize: 44, maxLines: 3, colorKey: 'primary' },
      ],
      decos: [
        { type: 'sidebar', fromPreset: true },
        { type: 'divider', rect: { x: 0.04, y: 0.88, w: 0.08, h: 0 } },
      ],
    },
    criminal: {
      photos: [
        {
          source: 'office',
          rect: { x: 0, y: 0, w: 1, h: 1 },
          shape: 'rect', objectFit: 'cover',
          overlay: 'darken-heavy', overlayDirection: 'full', fallback: 'solid-bg', alpha: 0.2
        },
        {
          source: 'profile',
          rect: { x: 0.35, y: 0.0, w: 0.65, h: 1.0 },
          shape: 'rect', objectFit: 'cover',
          overlay: 'gradient-bottom', overlayDirection: 'bottom', fallback: 'solid-bg'
        },
      ],
      texts: [
        { bind: '형사전문', role: 'category', rect: { x: 0.04, y: 0.74, w: 0.5, h: 0.05 }, align: 'left', fontSize: 16, colorKey: 'accent' },
        { bind: '{{post.title}}', role: 'title', rect: { x: 0.04, y: 0.80, w: 0.92, h: 0.16 }, align: 'left', fontSize: 48, maxLines: 2, colorKey: 'primary' },
      ],
      decos: [
        { type: 'sidebar', fromPreset: true },
        { type: 'scanlines', fromPreset: true },
      ],
    },
    family: {
      photos: [
        {
          source: 'office',
          rect: { x: 0, y: 0, w: 1, h: 1 },
          shape: 'rect', objectFit: 'cover',
          overlay: 'lighten', fallback: 'gradient-bg', alpha: 0.05
        },
        {
          source: 'profile',
          rect: { x: 0.55, y: 0.45, w: 0.40, h: 0.55 },
          shape: 'rect', objectFit: 'cover',
          borderRadius: 200,
          overlay: 'none', fallback: 'solid-bg',
        },
      ],
      texts: [
        { bind: '{{post.category}}', role: 'category', rect: { x: 0.08, y: 0.14, w: 0.6, h: 0.05 }, align: 'left', fontSize: 18, colorKey: 'accent' },
        { bind: '{{post.title}}', role: 'title', rect: { x: 0.08, y: 0.22, w: 0.6, h: 0.22 }, align: 'left', fontSize: 44, maxLines: 2, colorKey: 'primary' },
      ],
      decos: [
        { type: 'underline', rect: { x: 0.08, y: 0.46, w: 0.06, h: 0 } },
        { type: 'circle', fromPreset: true },
      ],
    },
    classic: {
      photos: [
        {
          source: 'office',
          rect: { x: 0, y: 0, w: 1, h: 1 },
          shape: 'rect', objectFit: 'cover',
          overlay: 'style-default', fallback: 'solid-bg', alpha: 0.15
        },
        {
          source: 'profile',
          rect: { x: 0.30, y: 0.58, w: 0.40, h: 0.42 },
          shape: 'rect', objectFit: 'cover',
          overlay: 'none', fallback: 'solid-bg',
        },
      ],
      texts: [
        { bind: '{{profile.firm}}', role: 'category', rect: { x: 0.1, y: 0.20, w: 0.8, h: 0.05 }, align: 'center', fontSize: 15, colorKey: 'accent' },
        { bind: '{{post.title}}', role: 'title', rect: { x: 0.1, y: 0.35, w: 0.8, h: 0.30 }, align: 'center', fontSize: 44, maxLines: 3, colorKey: 'primary' },
      ],
      decos: [
        { type: 'frame', fromPreset: true },
        { type: 'divider', rect: { x: 0.42, y: 0.30, w: 0.16, h: 0 } },
      ],
    },
  },
};

// ---------------------------------------------------------------------------
export const SUMMARY_TEMPLATE: ImageTypeTemplate = {
  id: 'summary',
  name: '요약 카드',
  description: '핵심 포인트 정리',
  requiredData: ['{{post.title}}', '{{post.keypoints}}'],
  aspectRatio: { w: 1, h: 1 },
  layouts: {
    young: {
      photos: [
        { source: 'office', rect: { x: 0, y: 0, w: 1, h: 1 }, shape: 'rect', objectFit: 'cover', overlay: 'darken-heavy', fallback: 'solid-bg', alpha: 0.1 },
        { source: 'logo', rect: { x: 0.80, y: 0.90, w: 0.15, h: 0.06 }, shape: 'rect', objectFit: 'contain', overlay: 'none', fallback: 'solid-bg' },
      ],
      texts: [
        { bind: 'KEY POINTS', role: 'title', rect: { x: 0.08, y: 0.08, w: 0.9, h: 0.06 }, align: 'left', fontSize: 22, colorKey: 'accent' },
        { bind: '{{post.keypoints}}', role: 'body', rect: { x: 0.08, y: 0.20, w: 0.84, h: 0.65 }, align: 'left', fontSize: 24, colorKey: 'secondary' },
      ],
      decos: [ { type: 'underline', rect: { x: 0.08, y: 0.16, w: 0.05, h: 0 } } ],
    },
    mature: {
      photos: [
        { source: 'office', rect: { x: 0, y: 0, w: 1, h: 1 }, shape: 'rect', objectFit: 'cover', overlay: 'style-default', fallback: 'solid-bg', alpha: 0.15 },
        { source: 'logo', rect: { x: 0.08, y: 0.90, w: 0.15, h: 0.06 }, shape: 'rect', objectFit: 'contain', overlay: 'none', fallback: 'solid-bg' },
      ],
      texts: [
        { bind: '핵심 쟁점 요약', role: 'title', rect: { x: 0.08, y: 0.10, w: 0.6, h: 0.06 }, align: 'left', fontSize: 28, colorKey: 'primary' },
        { bind: '{{post.keypoints}}', role: 'body', rect: { x: 0.08, y: 0.22, w: 0.84, h: 0.65 }, align: 'left', fontSize: 24, colorKey: 'secondary' },
      ],
      decos: [ { type: 'sidebar', fromPreset: true }, { type: 'divider', rect: { x: 0.08, y: 0.18, w: 0.06, h: 0 } } ],
    },
    criminal: {
      photos: [
        { source: 'office', rect: { x: 0, y: 0, w: 1, h: 1 }, shape: 'rect', objectFit: 'cover', overlay: 'darken-heavy', fallback: 'solid-bg', alpha: 0.1 },
        { source: 'logo', rect: { x: 0.82, y: 0.90, w: 0.14, h: 0.06 }, shape: 'rect', objectFit: 'contain', overlay: 'none', fallback: 'solid-bg' },
      ],
      texts: [
        { bind: '핵심 쟁점 사항', role: 'title', rect: { x: 0.06, y: 0.08, w: 0.5, h: 0.06 }, align: 'left', fontSize: 32, colorKey: 'primary' },
        { bind: '{{post.keypoints}}', role: 'body', rect: { x: 0.06, y: 0.18, w: 0.88, h: 0.70 }, align: 'left', fontSize: 24, colorKey: 'secondary' },
      ],
      decos: [ { type: 'sidebar', fromPreset: true }, { type: 'scanlines', fromPreset: true } ],
    },
    family: {
      photos: [
        { source: 'office', rect: { x: 0, y: 0, w: 1, h: 1 }, shape: 'rect', objectFit: 'cover', overlay: 'lighten', fallback: 'solid-bg', alpha: 0.05 },
        { source: 'logo', rect: { x: 0.80, y: 0.90, w: 0.15, h: 0.06 }, shape: 'rect', objectFit: 'contain', overlay: 'none', fallback: 'solid-bg' },
      ],
      texts: [
        { bind: '핵심 정리', role: 'title', rect: { x: 0.06, y: 0.10, w: 0.6, h: 0.06 }, align: 'left', fontSize: 30, colorKey: 'primary' },
        { bind: '{{post.keypoints}}', role: 'body', rect: { x: 0.06, y: 0.22, w: 0.88, h: 0.65 }, align: 'left', fontSize: 24, colorKey: 'secondary' },
      ],
      decos: [ { type: 'underline', rect: { x: 0.06, y: 0.18, w: 0.05, h: 0 } } ],
    },
    classic: {
      photos: [
        { source: 'office', rect: { x: 0, y: 0, w: 1, h: 1 }, shape: 'rect', objectFit: 'cover', overlay: 'style-default', fallback: 'solid-bg', alpha: 0.15 },
        { source: 'logo', rect: { x: 0.40, y: 0.90, w: 0.20, h: 0.06 }, shape: 'rect', objectFit: 'contain', overlay: 'none', fallback: 'solid-bg' },
      ],
      texts: [
        { bind: '핵심 쟁점 요약', role: 'title', rect: { x: 0.1, y: 0.08, w: 0.8, h: 0.06 }, align: 'center', fontSize: 32, colorKey: 'primary' },
        { bind: '{{post.keypoints}}', role: 'body', rect: { x: 0.08, y: 0.20, w: 0.84, h: 0.65 }, align: 'center', fontSize: 22, colorKey: 'secondary' },
      ],
      decos: [ { type: 'frame', fromPreset: true }, { type: 'divider', rect: { x: 0.42, y: 0.16, w: 0.16, h: 0 } } ],
    },
  },
};

// ---------------------------------------------------------------------------
export const BRAND_TEMPLATE: ImageTypeTemplate = {
  id: 'brand',
  name: '브랜드',
  description: '사무실 전경 + 로고 + 슬로건',
  requiredData: ['{{profile.firm}}', '{{profile.slogan}}', '{{profile.specialties}}'],
  aspectRatio: { w: 1, h: 1 },
  layouts: {
    young: {
      photos: [
        { source: 'office', rect: { x: 0, y: 0, w: 1, h: 1 }, shape: 'rect', objectFit: 'cover', overlay: 'gradient-bottom', overlayDirection: 'bottom', fallback: 'gradient-bg' },
        { source: 'logo', rect: { x: 0.05, y: 0.68, w: 0.25, h: 0.10 }, shape: 'rect', objectFit: 'contain', overlay: 'none', fallback: 'solid-bg' },
      ],
      texts: [
        { bind: '{{profile.slogan}}', role: 'title', rect: { x: 0.05, y: 0.80, w: 0.90, h: 0.10 }, align: 'left', fontSize: 36, maxLines: 2, colorKey: 'primary' },
        { bind: '{{profile.specialties}}', role: 'meta', rect: { x: 0.05, y: 0.92, w: 0.90, h: 0.05 }, align: 'left', fontSize: 16, colorKey: 'muted' },
      ],
      decos: [],
    },
    mature: {
      photos: [
        { source: 'office', rect: { x: 0, y: 0, w: 0.50, h: 1 }, shape: 'rect', objectFit: 'cover', overlay: 'none', fallback: 'solid-bg' },
        { source: 'logo', rect: { x: 0.55, y: 0.25, w: 0.26, h: 0.10 }, shape: 'rect', objectFit: 'contain', overlay: 'none', fallback: 'solid-bg' },
      ],
      texts: [
        { bind: '{{profile.slogan}}', role: 'title', rect: { x: 0.55, y: 0.42, w: 0.40, h: 0.20 }, align: 'left', fontSize: 32, maxLines: 3, colorKey: 'primary' },
        { bind: '{{profile.firm}}', role: 'meta', rect: { x: 0.55, y: 0.72, w: 0.40, h: 0.05 }, align: 'left', fontSize: 16, colorKey: 'accent' },
      ],
      decos: [ { type: 'divider', rect: { x: 0.55, y: 0.66, w: 0.08, h: 0 } } ],
    },
    criminal: {
      photos: [
        { source: 'office', rect: { x: 0, y: 0, w: 1, h: 1 }, shape: 'rect', objectFit: 'cover', overlay: 'darken-heavy', overlayDirection: 'full', fallback: 'solid-bg' },
        { source: 'logo', rect: { x: 0.06, y: 0.08, w: 0.25, h: 0.10 }, shape: 'rect', objectFit: 'contain', overlay: 'none', fallback: 'solid-bg' },
      ],
      texts: [
        { bind: '{{profile.slogan}}', role: 'title', rect: { x: 0.06, y: 0.76, w: 0.88, h: 0.12 }, align: 'left', fontSize: 40, maxLines: 2, colorKey: 'primary' },
        { bind: '{{profile.firm}}', role: 'meta', rect: { x: 0.06, y: 0.90, w: 0.5, h: 0.04 }, align: 'left', fontSize: 16, colorKey: 'accent' },
      ],
      decos: [ { type: 'sidebar', fromPreset: true }, { type: 'scanlines', fromPreset: true } ],
    },
    family: {
      photos: [
        { source: 'office', rect: { x: 0, y: 0, w: 1, h: 1 }, shape: 'rect', objectFit: 'cover', overlay: 'lighten', overlayDirection: 'full', fallback: 'gradient-bg' },
        { source: 'logo', rect: { x: 0.30, y: 0.22, w: 0.40, h: 0.12 }, shape: 'rect', objectFit: 'contain', overlay: 'none', fallback: 'solid-bg' },
      ],
      texts: [
        { bind: '{{profile.slogan}}', role: 'title', rect: { x: 0.10, y: 0.42, w: 0.80, h: 0.15 }, align: 'center', fontSize: 36, maxLines: 2, colorKey: 'primary' },
        { bind: '{{profile.specialties}}', role: 'meta', rect: { x: 0.10, y: 0.80, w: 0.80, h: 0.05 }, align: 'center', fontSize: 18, colorKey: 'accent' },
      ],
      decos: [ { type: 'circle', fromPreset: true } ],
    },
    classic: {
      photos: [
        { source: 'office', rect: { x: 0, y: 0, w: 1, h: 1 }, shape: 'rect', objectFit: 'cover', overlay: 'style-default', overlayDirection: 'full', fallback: 'gradient-bg' },
        { source: 'logo', rect: { x: 0.30, y: 0.22, w: 0.40, h: 0.10 }, shape: 'rect', objectFit: 'contain', overlay: 'none', fallback: 'solid-bg' },
      ],
      texts: [
        { bind: '{{profile.slogan}}', role: 'title', rect: { x: 0.10, y: 0.42, w: 0.80, h: 0.15 }, align: 'center', fontSize: 36, maxLines: 2, colorKey: 'primary' },
        { bind: '{{profile.firm}}', role: 'meta', rect: { x: 0.10, y: 0.82, w: 0.80, h: 0.05 }, align: 'center', fontSize: 16, colorKey: 'accent' },
      ],
      decos: [ { type: 'frame', fromPreset: true }, { type: 'divider', rect: { x: 0.42, y: 0.38, w: 0.16, h: 0 } } ],
    },
  },
};

// ---------------------------------------------------------------------------
export const CAREER_TEMPLATE: ImageTypeTemplate = {
  id: 'career',
  name: '경력 약력',
  description: '프로필 사진 + 이력',
  requiredData: [ '{{profile.name}}', '{{profile.title}}', '{{profile.credentials}}', '{{profile.specialties}}' ],
  aspectRatio: { w: 1, h: 1 },
  layouts: {
    young: {
      photos: [
        { source: 'profile', rect: { x: 0, y: 0, w: 0.45, h: 1 }, shape: 'rect', objectFit: 'cover', overlay: 'none', fallback: 'gradient-bg' },
        { source: 'office', rect: { x: 0, y: 0, w: 1, h: 1 }, shape: 'rect', objectFit: 'cover', overlay: 'darken-heavy', fallback: 'solid-bg', alpha: 0.15 },
      ],
      texts: [
        { bind: '{{profile.name}}', role: 'title', rect: { x: 0.50, y: 0.12, w: 0.44, h: 0.08 }, align: 'left', fontSize: 48, colorKey: 'primary' },
        { bind: '{{profile.title}}', role: 'subtitle', rect: { x: 0.50, y: 0.22, w: 0.44, h: 0.05 }, align: 'left', fontSize: 18, colorKey: 'accent' },
        { bind: '{{profile.credentials}}', role: 'body', rect: { x: 0.50, y: 0.38, w: 0.44, h: 0.50 }, align: 'left', fontSize: 20, colorKey: 'muted' },
      ],
      decos: [ { type: 'divider', rect: { x: 0.50, y: 0.32, w: 0.10, h: 0 } } ],
    },
    mature: {
      photos: [
        { source: 'office', rect: { x: 0, y: 0, w: 1, h: 1 }, shape: 'rect', objectFit: 'cover', overlay: 'style-default', fallback: 'solid-bg', alpha: 0.2 },
        { source: 'profile', rect: { x: 0.50, y: 0, w: 0.50, h: 1 }, shape: 'rect', objectFit: 'cover', overlay: 'none', fallback: 'solid-bg' },
      ],
      texts: [
        { bind: '{{profile.title}}', role: 'category', rect: { x: 0.06, y: 0.30, w: 0.40, h: 0.05 }, align: 'left', fontSize: 18, colorKey: 'accent' },
        { bind: '{{profile.name}}', role: 'title', rect: { x: 0.06, y: 0.38, w: 0.40, h: 0.10 }, align: 'left', fontSize: 52, colorKey: 'primary' },
        { bind: '{{profile.credentials}}', role: 'body', rect: { x: 0.06, y: 0.56, w: 0.40, h: 0.35 }, align: 'left', fontSize: 20, colorKey: 'muted' },
      ],
      decos: [ { type: 'sidebar', fromPreset: true }, { type: 'divider', rect: { x: 0.06, y: 0.51, w: 0.08, h: 0 } } ],
    },
    criminal: {
      photos: [
        { source: 'office', rect: { x: 0, y: 0, w: 1, h: 1 }, shape: 'rect', objectFit: 'cover', overlay: 'darken-heavy', fallback: 'solid-bg', alpha: 0.2 },
        { source: 'profile', rect: { x: 0.55, y: 0, w: 0.45, h: 1 }, shape: 'rect', objectFit: 'cover', overlay: 'gradient-bottom', overlayDirection: 'left', fallback: 'solid-bg' },
      ],
      texts: [
        { bind: 'ATTORNEY AT LAW', role: 'category', rect: { x: 0.06, y: 0.30, w: 0.50, h: 0.05 }, align: 'left', fontSize: 18, colorKey: 'accent' },
        { bind: '{{profile.name}}', role: 'title', rect: { x: 0.06, y: 0.38, w: 0.50, h: 0.10 }, align: 'left', fontSize: 52, colorKey: 'primary' },
        { bind: '{{profile.title}}', role: 'subtitle', rect: { x: 0.06, y: 0.50, w: 0.50, h: 0.05 }, align: 'left', fontSize: 20, colorKey: 'muted' },
        { bind: '{{profile.credentials}}', role: 'body', rect: { x: 0.06, y: 0.64, w: 0.48, h: 0.30 }, align: 'left', fontSize: 20, colorKey: 'muted' },
      ],
      decos: [ { type: 'sidebar', fromPreset: true }, { type: 'scanlines', fromPreset: true }, { type: 'divider', rect: { x: 0.06, y: 0.58, w: 0.08, h: 0 } } ],
    },
    family: {
      photos: [
        { source: 'office', rect: { x: 0, y: 0, w: 1, h: 1 }, shape: 'rect', objectFit: 'cover', overlay: 'lighten', fallback: 'solid-bg', alpha: 0.05 },
        { source: 'profile', rect: { x: 0.55, y: 0.1, w: 0.45, h: 0.9 }, shape: 'rect', objectFit: 'cover', overlay: 'none', fallback: 'solid-bg' },
      ],
      texts: [
        { bind: '{{profile.title}}', role: 'category', rect: { x: 0.06, y: 0.30, w: 0.48, h: 0.05 }, align: 'left', fontSize: 20, colorKey: 'accent' },
        { bind: '{{profile.name}}', role: 'title', rect: { x: 0.06, y: 0.38, w: 0.48, h: 0.10 }, align: 'left', fontSize: 52, colorKey: 'primary' },
        { bind: '{{profile.credentials}}', role: 'body', rect: { x: 0.06, y: 0.56, w: 0.46, h: 0.34 }, align: 'left', fontSize: 22, colorKey: 'muted' },
      ],
      decos: [ { type: 'circle', fromPreset: true }, { type: 'underline', rect: { x: 0.06, y: 0.51, w: 0.08, h: 0 } } ],
    },
    classic: {
      photos: [
        { source: 'office', rect: { x: 0, y: 0, w: 1, h: 1 }, shape: 'rect', objectFit: 'cover', overlay: 'style-default', fallback: 'solid-bg', alpha: 0.15 },
        { source: 'profile', rect: { x: 0.32, y: 0.10, w: 0.36, h: 0.36 }, shape: 'circle', objectFit: 'cover', overlay: 'none', fallback: 'solid-bg' },
      ],
      texts: [
        { bind: '{{profile.name}}', role: 'title', rect: { x: 0.10, y: 0.50, w: 0.80, h: 0.08 }, align: 'center', fontSize: 48, colorKey: 'primary' },
        { bind: '{{profile.title}}', role: 'subtitle', rect: { x: 0.10, y: 0.60, w: 0.80, h: 0.05 }, align: 'center', fontSize: 20, colorKey: 'accent' },
        { bind: '{{profile.credentials}}', role: 'body', rect: { x: 0.10, y: 0.72, w: 0.80, h: 0.22 }, align: 'center', fontSize: 20, colorKey: 'muted' },
      ],
      decos: [ { type: 'frame', fromPreset: true }, { type: 'divider', rect: { x: 0.42, y: 0.67, w: 0.16, h: 0 } } ],
    },
  },
};

// ---------------------------------------------------------------------------
export const CONTACT_TEMPLATE: ImageTypeTemplate = {
  id: 'contact',
  name: '연락처·상담',
  description: '전화번호 + 주소 + 상담',
  requiredData: [ '{{profile.name}}', '{{profile.firm}}', '{{profile.phone1}}', '{{profile.phone2}}', '{{profile.address}}' ],
  aspectRatio: { w: 1, h: 1 },
  layouts: {
    young: {
      photos: [
        { source: 'office', rect: { x: 0, y: 0, w: 1, h: 1 }, shape: 'rect', objectFit: 'cover', overlay: 'darken-heavy', fallback: 'solid-bg', alpha: 0.1 },
        { source: 'profile', rect: { x: 0.76, y: 0.06, w: 0.18, h: 0.18 }, shape: 'circle', objectFit: 'cover', overlay: 'none', fallback: 'solid-bg' },
      ],
      texts: [
        { bind: '{{profile.firm}} · {{profile.name}} 변호사', role: 'label', rect: { x: 0.06, y: 0.10, w: 0.68, h: 0.04 }, align: 'left', fontSize: 18, colorKey: 'muted' },
        { bind: '{{profile.phone1}}', role: 'title', rect: { x: 0.06, y: 0.22, w: 0.90, h: 0.12 }, align: 'left', fontSize: 64, colorKey: 'primary' },
        { bind: '{{profile.phone2}}', role: 'subtitle', rect: { x: 0.06, y: 0.36, w: 0.90, h: 0.05 }, align: 'left', fontSize: 24, colorKey: 'muted' },
        { bind: '{{profile.address}}', role: 'meta', rect: { x: 0.06, y: 0.88, w: 0.90, h: 0.04 }, align: 'left', fontSize: 16, colorKey: 'muted' },
      ],
      decos: [], cta: { text: '상담 예약', rect: { x: 0.06, y: 0.70, w: 0.30, h: 0.10 } },
    },
    mature: {
      photos: [
        { source: 'office', rect: { x: 0, y: 0, w: 1, h: 1 }, shape: 'rect', objectFit: 'cover', overlay: 'style-default', fallback: 'solid-bg', alpha: 0.15 },
        { source: 'profile', rect: { x: 0.74, y: 0.28, w: 0.20, h: 0.20 }, shape: 'circle', objectFit: 'cover', overlay: 'none', fallback: 'solid-bg' },
      ],
      texts: [
        { bind: '{{profile.firm}}', role: 'category', rect: { x: 0.06, y: 0.28, w: 0.60, h: 0.05 }, align: 'left', fontSize: 18, colorKey: 'accent' },
        { bind: '{{profile.phone1}}', role: 'title', rect: { x: 0.06, y: 0.36, w: 0.60, h: 0.10 }, align: 'left', fontSize: 56, colorKey: 'primary' },
        { bind: '직통 {{profile.phone2}}', role: 'subtitle', rect: { x: 0.06, y: 0.50, w: 0.60, h: 0.05 }, align: 'left', fontSize: 22, colorKey: 'muted' },
        { bind: '{{profile.address}}', role: 'meta', rect: { x: 0.06, y: 0.66, w: 0.60, h: 0.04 }, align: 'left', fontSize: 16, colorKey: 'muted' },
      ],
      decos: [ { type: 'sidebar', fromPreset: true }, { type: 'divider', rect: { x: 0.06, y: 0.60, w: 0.08, h: 0 } } ],
      cta: { text: '상담 예약', rect: { x: 0.06, y: 0.78, w: 0.26, h: 0.08 } },
    },
    criminal: {
      photos: [
        { source: 'office', rect: { x: 0, y: 0, w: 1, h: 1 }, shape: 'rect', objectFit: 'cover', overlay: 'darken-heavy', fallback: 'solid-bg', alpha: 0.1 },
        { source: 'profile', rect: { x: 0.06, y: 0.08, w: 0.15, h: 0.15 }, shape: 'circle', objectFit: 'cover', overlay: 'none', fallback: 'solid-bg' },
      ],
      texts: [
        { bind: '{{profile.name}} 변호사 · 형사전문', role: 'label', rect: { x: 0.24, y: 0.10, w: 0.72, h: 0.04 }, align: 'left', fontSize: 18, colorKey: 'muted' },
        { bind: '24시간 긴급 상담', role: 'subtitle', rect: { x: 0.24, y: 0.18, w: 0.72, h: 0.04 }, align: 'left', fontSize: 20, colorKey: 'accent' },
        { bind: '{{profile.phone1}}', role: 'title', rect: { x: 0.06, y: 0.34, w: 0.90, h: 0.14 }, align: 'left', fontSize: 68, colorKey: 'primary' },
        { bind: '직통 {{profile.phone2}}', role: 'subtitle', rect: { x: 0.06, y: 0.50, w: 0.5, h: 0.05 }, align: 'left', fontSize: 24, colorKey: 'muted' },
        { bind: '{{profile.address}}', role: 'meta', rect: { x: 0.50, y: 0.88, w: 0.44, h: 0.04 }, align: 'right', fontSize: 14, colorKey: 'muted' },
      ],
      decos: [ { type: 'sidebar', fromPreset: true }, { type: 'scanlines', fromPreset: true } ],
      cta: { text: '긴급 상담', rect: { x: 0.06, y: 0.76, w: 0.26, h: 0.10 } },
    },
    family: {
      photos: [
        { source: 'office', rect: { x: 0, y: 0, w: 1, h: 1 }, shape: 'rect', objectFit: 'cover', overlay: 'lighten', fallback: 'solid-bg', alpha: 0.05 },
        { source: 'profile', rect: { x: 0.72, y: 0.65, w: 0.22, h: 0.22 }, shape: 'circle', objectFit: 'cover', overlay: 'none', fallback: 'solid-bg' },
      ],
      texts: [
        { bind: '{{profile.name}} 변호사 · {{profile.firm}}', role: 'label', rect: { x: 0.08, y: 0.10, w: 0.84, h: 0.04 }, align: 'left', fontSize: 18, colorKey: 'accent' },
        { bind: '{{profile.phone1}}', role: 'title', rect: { x: 0.08, y: 0.20, w: 0.84, h: 0.10 }, align: 'left', fontSize: 56, colorKey: 'primary' },
        { bind: '직통 {{profile.phone2}}', role: 'subtitle', rect: { x: 0.08, y: 0.34, w: 0.5, h: 0.04 }, align: 'left', fontSize: 20, colorKey: 'muted' },
        { bind: '{{profile.address}}', role: 'meta', rect: { x: 0.08, y: 0.88, w: 0.60, h: 0.04 }, align: 'left', fontSize: 16, colorKey: 'muted' },
      ],
      decos: [ { type: 'circle', fromPreset: true } ],
      cta: { text: '상담 예약', rect: { x: 0.08, y: 0.70, w: 0.28, h: 0.10 } },
    },
    classic: {
      photos: [
        { source: 'office', rect: { x: 0, y: 0, w: 1, h: 1 }, shape: 'rect', objectFit: 'cover', overlay: 'style-default', fallback: 'solid-bg', alpha: 0.15 },
        { source: 'logo', rect: { x: 0.4, y: 0.75, w: 0.2, h: 0.08 }, shape: 'rect', objectFit: 'contain', overlay: 'none', fallback: 'solid-bg' },
      ],
      texts: [
        { bind: '{{profile.firm}}', role: 'category', rect: { x: 0.10, y: 0.16, w: 0.80, h: 0.05 }, align: 'center', fontSize: 18, colorKey: 'accent' },
        { bind: '{{profile.phone1}}', role: 'title', rect: { x: 0.10, y: 0.32, w: 0.80, h: 0.12 }, align: 'center', fontSize: 60, colorKey: 'primary' },
        { bind: '직통 {{profile.phone2}}', role: 'subtitle', rect: { x: 0.10, y: 0.46, w: 0.80, h: 0.05 }, align: 'center', fontSize: 22, colorKey: 'muted' },
        { bind: '{{profile.address}}', role: 'meta', rect: { x: 0.10, y: 0.88, w: 0.80, h: 0.04 }, align: 'center', fontSize: 16, colorKey: 'muted' },
      ],
      decos: [ { type: 'frame', fromPreset: true }, { type: 'divider', rect: { x: 0.42, y: 0.26, w: 0.16, h: 0 } } ],
      cta: { text: '상담 예약', rect: { x: 0.35, y: 0.60, w: 0.30, h: 0.08 } },
    },
  },
};

export const ALL_TEMPLATES: ImageTypeTemplate[] = [ MAIN_TEMPLATE, SUMMARY_TEMPLATE, BRAND_TEMPLATE, CAREER_TEMPLATE, CONTACT_TEMPLATE ];

export const TEMPLATE_MAP: Record<ImageTypeId, ImageTypeTemplate> = {
  main: MAIN_TEMPLATE, summary: SUMMARY_TEMPLATE, brand: BRAND_TEMPLATE,
  career: CAREER_TEMPLATE, contact: CONTACT_TEMPLATE,
};

// ---------------------------------------------------------------------------
// 9. 로고 컬러 추출 → 악센트 오버라이드 유틸
// ---------------------------------------------------------------------------

export interface ExtractedLogoColors {
  primary: string;
  secondary?: string;
  luminance: number;    // 0~1
}

/**
 * 로고에서 추출된 컬러를 스타일 프리셋에 적용
 * logoColorPolicy 에 따라 조건부 오버라이드
 */
export function applyLogoColor(
  style: StylePreset,
  logoColors: ExtractedLogoColors,
): StylePreset {
  const policy = style.logoColorPolicy;

  if (!policy.overrideAccent) return style;

  const lum = logoColors.luminance;
  if (policy.minLuminance !== undefined && lum < policy.minLuminance) return style;
  if (policy.maxLuminance !== undefined && lum > policy.maxLuminance) return style;

  return {
    ...style,
    colors: {
      ...style.colors,
      accent: {
        ...style.colors.accent,
        primary: logoColors.primary,
        ...(logoColors.secondary ? { secondary: logoColors.secondary } : {}),
      },
    },
  };
}
