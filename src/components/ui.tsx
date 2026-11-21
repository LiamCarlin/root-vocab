import { router } from 'expo-router';
import { ArrowLeft, Check, ChevronRight, X, type LucideIcon } from 'lucide-react-native';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { buzz } from '@/lib/audio';
import { noteTap } from '@/lib/signals';
import { GUTTER, ON_BLOCK, motion, radius, useTheme, type BlockTone, type Colors, type Variant } from '@/theme';
import { Mascot, type Pose } from './Mascot';

// Design rule for v3: icons and gestures carry the interface. Words on screen
// are the learning content. Every icon-only control still has an
// accessibilityLabel, so nothing is lost to a screen reader.

type ColorKey = keyof Colors;

// Inside a colour block, text is always black, whatever the theme.
const OnBlock = createContext(false);
export const useOnBlock = () => useContext(OnBlock);

// ── Text ──────────────────────────────────────────────────────────────────
export function Txt({ v = 'body', color = 'ink', center, style, ...rest }: TextProps & { v?: Variant; color?: ColorKey; center?: boolean }) {
  const t = useTheme();
  const onBlock = useContext(OnBlock);
  const col = onBlock && (color === 'ink' || color === 'ink2' || color === 'ink3') ? ON_BLOCK[color] : t.c[color];
  // The app has its own text-size setting; the cap stops the phone's largest accessibility sizes from stacking on top and clipping fixed-height buttons and tiles.
  return <Text maxFontSizeMultiplier={1.3} {...rest} style={[t.text(v), { color: col }, center && { textAlign: 'center' }, style]} />;
}

/** White text for a black (`tone="ink"`) block or screen, in every theme. */
export function TxtOnInk({ v = 'body', dim, center, style, ...rest }: TextProps & { v?: Variant; dim?: boolean; center?: boolean }) {
  const t = useTheme();
  return <Text maxFontSizeMultiplier={1.3} {...rest} style={[t.text(v), { color: dim ? 'rgba(255,255,255,0.64)' : '#FFFFFF' }, center && { textAlign: 'center' }, style]} />;
}

// ── Press feedback ────────────────────────────────────────────────────────
const APressable = Animated.createAnimatedComponent(Pressable);

export function Tap({ style, onPress, haptic = true, disabled, children, scaleTo = 0.96, ...rest }: PressableProps & { haptic?: boolean; scaleTo?: number; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      {...rest}
      disabled={disabled}
      onPressIn={() => s.set(withTiming(scaleTo, { duration: motion.tap, easing: Easing.out(Easing.quad) }))}
      onPressOut={() => s.set(withTiming(1, { duration: motion.tap, easing: Easing.out(Easing.quad) }))}
      onPress={(e) => {
        if (haptic) buzz.tap();
        noteTap(rest.accessibilityLabel);
        onPress?.(e);
      }}
      style={[style, anim]}>
      {children}
    </APressable>
  );
}

// ── Buttons ───────────────────────────────────────────────────────────────
export type BtnKind = 'ink' | 'brand' | 'orange' | 'white' | 'soft' | 'ghost' | 'danger' | 'mint';

function btnColors(kind: BtnKind, c: Colors, dark: boolean): { bg: string; fg: string; lip: string } {
  switch (kind) {
    case 'ink':
      // The main button: the "press this" blue, not black, so the one thing to do is the one bit of colour.
      return { bg: c.press, fg: '#FFFFFF', lip: c.press };
    case 'brand':
      return { bg: c.brand, fg: ON_BLOCK.ink, lip: '#7B97E8' };
    case 'orange':
      return { bg: c.orange, fg: ON_BLOCK.ink, lip: '#D6781F' };
    case 'mint':
      return { bg: c.mint, fg: ON_BLOCK.ink, lip: '#8FD3A2' };
    case 'white':
      return { bg: '#FFFFFF', fg: ON_BLOCK.ink, lip: '#D5D6E0' };
    case 'danger':
      return { bg: c.error, fg: '#FFFFFF', lip: '#B0332C' };
    case 'soft':
      return { bg: c.surface2, fg: c.ink, lip: c.line };
    case 'ghost':
      return { bg: 'transparent', fg: c.ink2, lip: 'transparent' };
  }
}

/**
 * The main action: a chunky pill with a pressable lip. Icon-first. Give it a
 * `label` only when an icon alone would be ambiguous (two words at most);
 * `a11y` names it for screen readers when there is no label.
 */
export function Btn({ icon: Icon, iconRight: IconR, label, a11y, onPress, kind = 'ink', disabled, style, small, flex }: { icon?: LucideIcon; iconRight?: LucideIcon; label?: string; a11y?: string; onPress?: () => void; kind?: BtnKind; disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean; flex?: number }) {
  const { c, dark } = useTheme();
  const base = btnColors(kind, c, dark);
  // A main button that is off stays readable: its reason is written on it ("Say the word first").
  const off = disabled && kind === 'ink';
  const { bg, fg, lip } = off ? { bg: c.surface2, fg: c.ink2, lip: c.surface2 } : base;
  // Flat: a solid pill, no 3D lip (that read as a children's game). Pressing dims it a little.
  const y = useSharedValue(1);
  const h = small ? 46 : 56;
  const anim = useAnimatedStyle(() => ({ opacity: y.value }));
  return (
    <Pressable
      onPress={() => {
        buzz.tap();
        noteTap(a11y ?? label);
        onPress?.();
      }}
      onPressIn={() => y.set(withTiming(0.7, { duration: 70 }))}
      onPressOut={() => y.set(withTiming(1, { duration: 110 }))}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      accessibilityState={{ disabled: !!disabled }}
      style={[{ height: h, opacity: disabled && !off ? 0.35 : 1, flex }, style]}>
      <Animated.View style={[{ height: h, borderRadius: radius.pill, backgroundColor: bg, borderWidth: kind === 'soft' || kind === 'white' ? 1.5 : 0, borderColor: lip, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, paddingHorizontal: 26 }, anim]}>
        {Icon && <Icon size={small ? 20 : 24} color={fg} strokeWidth={2.6} />}
        {!!label && (
          <Txt v="button" style={{ color: fg, fontSize: small ? 15 : undefined }} numberOfLines={1}>
            {label}
          </Txt>
        )}
        {IconR && <IconR size={small ? 20 : 24} color={fg} strokeWidth={2.6} />}
      </Animated.View>
    </Pressable>
  );
}

export type IconKind = 'ghost' | 'ink' | 'brand' | 'orange' | 'pink' | 'mint' | 'butter' | 'glass' | 'plain' | 'soft';

/** Round icon button. `label` is the screen-reader name and is always required. */
export function IconBtn({ icon: Icon, onPress, label, kind = 'ghost', size = 52, disabled, active, badge }: { icon: LucideIcon; onPress?: () => void; label: string; kind?: IconKind; size?: number; disabled?: boolean; active?: boolean; badge?: number }) {
  const { c, e1 } = useTheme();
  const onBlock = useContext(OnBlock);
  const k: IconKind = active ? 'ink' : kind;
  const bg = { ghost: c.surface, ink: c.press, brand: c.brand, orange: c.orange, pink: c.pink, mint: c.mint, butter: c.butter, glass: 'rgba(255,255,255,0.42)', plain: 'transparent', soft: c.surface2 }[k];
  const fg = k === 'ink' ? '#FFFFFF' : k === 'ghost' || k === 'soft' ? c.ink : k === 'plain' ? (onBlock ? ON_BLOCK.ink : c.ink) : ON_BLOCK.ink;
  return (
    <Tap onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled, selected: !!active }} style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: k === 'ghost' ? 1 : 0, borderColor: c.line, opacity: disabled ? 0.35 : 1 }, k === 'ghost' ? e1 : null]}>
      <Icon size={Math.round(size * 0.44)} color={fg} strokeWidth={2.4} />
      {!!badge && (
        <View style={{ position: 'absolute', right: -2, top: -2, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 2, borderColor: c.canvas }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: ON_BLOCK.ink }}>{badge}</Text>
        </View>
      )}
    </Tap>
  );
}

// ── Chip ──────────────────────────────────────────────────────────────────
export type ChipState = 'default' | 'selected' | 'correct' | 'wrong';

export function Chip({ label, onPress, state = 'default', selected, icon: Icon, onRemove, disabled, big, tone, style }: { label: string; onPress?: () => void; state?: ChipState; selected?: boolean; icon?: LucideIcon; onRemove?: () => void; disabled?: boolean; big?: boolean; tone?: BlockTone; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const st: ChipState = selected ? 'selected' : state;
  const toned = !!tone && st === 'default';
  const bg = toned ? c[tone!] : { default: c.surface, selected: c.ink, correct: c.mint, wrong: c.sun }[st];
  const fg = st === 'selected' ? c.onInk : toned || st === 'correct' ? ON_BLOCK.ink : c.ink;
  const border = toned ? 'transparent' : { default: c.line, selected: c.ink, correct: c.success, wrong: '#E6C766' }[st];
  const Shell = onPress ? Tap : View;
  // Shape says what it is: something to press is a pill with an outline; a word only to read is a
  // flat, square-cornered label with no outline, so it never passes for a button.
  const readOnly = !onPress && !onRemove;
  return (
    <Shell
      {...(onPress ? { onPress, disabled, accessibilityRole: 'button' as const, accessibilityState: { selected: st === 'selected', disabled: !!disabled }, accessibilityLabel: label } : null)}
      style={[readOnly ? { minHeight: big ? 48 : 36, paddingHorizontal: 14, borderRadius: 10, backgroundColor: st === 'default' ? c.surface2 : bg, flexDirection: 'row', alignItems: 'center', gap: 8 } : { minHeight: big ? 60 : 48, paddingHorizontal: big ? 22 : 18, borderRadius: radius.pill, backgroundColor: bg, borderWidth: 1.5, borderColor: border, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: disabled ? 0.4 : 1 }, style]}>
      {Icon && <Icon size={big ? 20 : 18} color={fg} strokeWidth={2.3} />}
      <Txt v={big ? 'heading' : 'bodyS'} style={{ color: fg }}>
        {label}
      </Txt>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={12} accessibilityRole="button" accessibilityLabel={`Remove ${label}`}>
          <X size={16} color={c.ink3} strokeWidth={2.6} />
        </Pressable>
      )}
    </Shell>
  );
}

export function ChipRow({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, style]}>{children}</View>;
}

// ── Blocks: the big rounded colour cards ──────────────────────────────────
export type Tone = BlockTone | 'ink' | 'surface' | 'soft' | 'error' | 'success';

export function Block({ children, tone = 'surface', onPress, style, pad = 22, round = radius.xl, a11y, outline }: { children?: ReactNode; tone?: Tone; onPress?: () => void; style?: StyleProp<ViewStyle>; pad?: number; round?: number; a11y?: string; outline?: ColorKey }) {
  const { c, e1 } = useTheme();
  const bg = tone === 'surface' ? c.surface : tone === 'soft' ? c.surface2 : tone === 'ink' ? '#0E0E13' : tone === 'error' ? c.errorTint : tone === 'success' ? c.mintTint : c[tone];
  const coloured = tone !== 'surface' && tone !== 'soft' && tone !== 'ink' && tone !== 'error' && tone !== 'success';
  // Shape says what it is. A card you can press has an edge: an outline and a lip under it, like a
  // key. A card you only read is flat, with no outline, so the two are never confused.
  const plain = tone === 'surface' || tone === 'soft';
  const edge: ViewStyle = onPress ? { borderWidth: 1.5, borderColor: plain ? '#CFD1DA' : 'rgba(14,14,19,0.18)' } : {};
  const base: ViewStyle = { backgroundColor: bg, borderRadius: round, padding: pad, overflow: 'hidden', ...edge, ...(outline ? { borderWidth: 2, borderColor: c[outline] } : null), ...e1 };
  const inner = <OnBlock.Provider value={coloured}>{children}</OnBlock.Provider>;
  if (onPress)
    return (
      <Tap onPress={onPress} scaleTo={0.98} style={[base, style]} accessibilityRole="button" accessibilityLabel={a11y}>
        {inner}
      </Tap>
    );
  return (
    <View style={[base, style]} accessibilityLabel={a11y}>
      {inner}
    </View>
  );
}

// ── Progress ──────────────────────────────────────────────────────────────
const ACircle = Animated.createAnimatedComponent(Circle);

/** Circular progress with anything in the middle: a count like "1/3", an icon, the mascot. */
export function Ring({ value, size = 64, stroke = 6, color, track, children }: { value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode }) {
  const { c, reduceMotion } = useTheme();
  const onBlock = useContext(OnBlock);
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(Math.max(0, Math.min(1, value)), { duration: reduceMotion ? 0 : motion.fill, easing: Easing.inOut(Easing.quad) });
  }, [value, reduceMotion, p]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - p.value) }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? (onBlock ? 'rgba(14,14,19,0.14)' : c.surface2)} strokeWidth={stroke} fill="none" />
        <ACircle cx={size / 2} cy={size / 2} r={r} stroke={color ?? (onBlock ? ON_BLOCK.ink : c.ink)} strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={`${len} ${len}`} animatedProps={props} />
      </Svg>
      {children}
    </View>
  );
}

export function Steps({ total, done }: { total: number; done: number }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6, flex: 1 }} accessibilityRole="progressbar" accessibilityLabel={`Step ${Math.min(done + 1, total)} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{ flex: i === done ? 1.8 : 1, height: 8, borderRadius: 4, backgroundColor: i < done ? c.ink : i === done ? c.orange : c.surface2 }} />
      ))}
    </View>
  );
}

export function Bar({ value, color = 'ink', height = 10 }: { value: number; color?: ColorKey; height?: number }) {
  const { c, reduceMotion } = useTheme();
  const onBlock = useContext(OnBlock);
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withTiming(Math.max(0, Math.min(1, value)), { duration: reduceMotion ? 0 : motion.fill, easing: Easing.inOut(Easing.quad) });
  }, [value, reduceMotion, w]);
  const st = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: onBlock ? 'rgba(14,14,19,0.14)' : c.surface2, overflow: 'hidden' }}>
      <Animated.View style={[{ height, borderRadius: height / 2, backgroundColor: onBlock && color === 'ink' ? ON_BLOCK.ink : c[color] }, st]} />
    </View>
  );
}

/** A number with an icon, in a pill: streak, gems, counts. */
export function Stat({ icon: Icon, value, tint = 'orange', onPress, a11y }: { icon: LucideIcon; value: string | number; tint?: ColorKey; onPress?: () => void; a11y: string }) {
  const { c, e1 } = useTheme();
  const Shell = onPress ? Tap : View;
  return (
    <Shell {...(onPress ? { onPress, accessibilityRole: 'button' as const } : { accessible: true })} accessibilityLabel={a11y} style={[{ height: 44, borderRadius: 22, backgroundColor: c.surface, borderWidth: onPress ? 1.5 : 0, borderColor: c.line, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14 }, e1]}>
      <Icon size={19} color={c[tint]} fill={c[tint]} strokeWidth={2} />
      <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 17, color: c.ink }}>{value}</Text>
    </Shell>
  );
}

// ── Screen scaffolding ────────────────────────────────────────────────────
export function Screen({ children, top, footer, scroll = true, gap = 16, pad = true, keyboard, bottomSpace = 0, tone }: { children: ReactNode; top?: ReactNode; footer?: ReactNode; scroll?: boolean; gap?: number; pad?: boolean; keyboard?: boolean; bottomSpace?: number; tone?: BlockTone | 'ink' }) {
  const { c } = useTheme();
  const bg = tone ? (tone === 'ink' ? '#0E0E13' : c[tone]) : c.canvas;
  const body = scroll ? (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: pad ? GUTTER : 0, paddingTop: 8, paddingBottom: 24 + bottomSpace, gap }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, paddingHorizontal: pad ? GUTTER : 0, paddingTop: 8, gap }}>{children}</View>
  );
  const content = (
    <OnBlock.Provider value={!!tone && tone !== 'ink'}>
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={footer ? ['top', 'bottom'] : ['top']}>
        {top}
        {body}
        {footer && <View style={{ paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: 10, gap: 10 }}>{footer}</View>}
      </SafeAreaView>
    </OnBlock.Provider>
  );
  if (!keyboard) return content;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {content}
    </KeyboardAvoidingView>
  );
}

/** Round back or close button on the left, progress or anything in the middle, icons on the right. No words. */
export function TopBar({ back = 'back', onBack, steps, center, right }: { back?: 'back' | 'close' | null; onBack?: () => void; steps?: { total: number; done: number }; center?: ReactNode; right?: ReactNode }) {
  const onBlock = useContext(OnBlock);
  const go = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  return (
    <View style={{ paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60 }}>
      {back !== null ? <IconBtn icon={back === 'close' ? X : ArrowLeft} onPress={go} label={back === 'close' ? 'Close' : 'Back'} kind={onBlock ? 'glass' : 'ghost'} size={48} /> : null}
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>{steps ? <Steps total={steps.total} done={steps.done} /> : center}</View>
      {right ?? (back !== null && !steps ? <View style={{ width: 48 }} /> : null)}
    </View>
  );
}

export function SectionLabel({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  return (
    // A section heading under the screen's one title: level 2, so the screen keeps a single h1.
    <Txt v="label" color="ink2" style={[{ marginTop: 8 }, style]} role="heading" aria-level={2}>
      {children}
    </Txt>
  );
}

// ── Rows (settings and lists) ─────────────────────────────────────────────
export function Group({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c, e1 } = useTheme();
  return (
    <View style={[{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }, e1, style]}>
      <OnBlock.Provider value={false}>{children}</OnBlock.Provider>
    </View>
  );
}

export function Row({ title, sub, right, left, icon: Icon, iconTone = 'soft', onPress, last, chevron, titleColor }: { title: string; sub?: string; right?: ReactNode; left?: ReactNode; icon?: LucideIcon; iconTone?: BlockTone | 'soft'; onPress?: () => void; last?: boolean; chevron?: boolean; titleColor?: ColorKey }) {
  const { c } = useTheme();
  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.line, minHeight: 68 }}>
      {/* A plain icon before the label. In a disc it read as a second, smaller button. */}
      {Icon && <Icon size={20} color={iconTone === 'soft' ? c.ink2 : c[iconTone]} strokeWidth={2.2} />}
      {left}
      <View style={{ flex: 1 }}>
        <Txt v="body" color={titleColor} numberOfLines={1}>
          {title}
        </Txt>
        {!!sub && (
          <Txt v="caption" color="ink2" numberOfLines={3}>
            {sub}
          </Txt>
        )}
      </View>
      {right}
      {chevron && <ChevronRight size={20} color={c.ink3} />}
    </View>
  );
  return onPress ? (
    <Tap onPress={onPress} scaleTo={0.99} accessibilityRole="button" accessibilityLabel={sub ? `${title}. ${sub}` : title}>
      {inner}
    </Tap>
  ) : (
    inner
  );
}

export function Tag({ label, tint = 'surface2', color = 'ink2', icon: Icon }: { label: string; tint?: ColorKey; color?: ColorKey; icon?: LucideIcon }) {
  const { c } = useTheme();
  const blocky = ['brand', 'orange', 'pink', 'mint', 'butter', 'lilac', 'stone'].includes(tint);
  const fg = blocky ? ON_BLOCK.ink : c[color];
  return (
    // A label you read: square-cornered and flat. Pills are kept for things you press.
    <View style={{ backgroundColor: c[tint], borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      {Icon && <Icon size={13} color={fg} strokeWidth={2.6} />}
      <Txt v="caption" style={{ color: fg }}>
        {label}
      </Txt>
    </View>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────
export function Toggle({ value, onChange, label, icon: Icon, a11y }: { value: boolean; onChange: (v: boolean) => void; label: string; icon?: LucideIcon; /** A fuller description for screen readers, when the short label needs one. */ a11y?: string }) {
  const { c, reduceMotion } = useTheme();
  const x = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    x.value = withTiming(value ? 1 : 0, { duration: reduceMotion ? 0 : 160 });
  }, [value, reduceMotion, x]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 24 }] }));
  return (
    <Pressable
      onPress={() => {
        buzz.tap();
        onChange(!value);
      }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={a11y ?? label}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52 }}>
      {Icon && <Icon size={20} color={c.ink2} strokeWidth={2.2} />}
      <Txt v="body" style={{ flex: 1 }} numberOfLines={2}>
        {label}
      </Txt>
      <View style={{ width: 58, height: 34, borderRadius: 17, backgroundColor: value ? c.ink : c.surface2, padding: 3, borderWidth: 1, borderColor: value ? c.ink : c.line }}>
        <Animated.View style={[{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: c.line }, knob]} />
      </View>
    </Pressable>
  );
}

// ── Text field ────────────────────────────────────────────────────────────
export function Field({ right, left, style, big, ...rest }: TextInputProps & { right?: ReactNode; left?: ReactNode; big?: boolean }) {
  const { c, text } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: big ? radius.lg : radius.pill, borderWidth: 2, borderColor: focus ? c.ink : c.line, paddingLeft: left ? 10 : 22, paddingRight: right ? 8 : 22, minHeight: big ? 76 : 60, gap: 8 }}>
      {left}
      <TextInput
        placeholderTextColor={c.ink3}
        maxFontSizeMultiplier={1.3}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        {...rest}
        onFocus={(e) => {
          setFocus(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocus(false);
          rest.onBlur?.(e);
        }}
        style={[text(big ? 'title' : 'body'), { color: c.ink, flex: 1, minWidth: 0, paddingVertical: 12, lineHeight: undefined }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null, style]}
      />
      {right}
    </View>
  );
}

// ── Root speaking: only for things worth reading (a meaning, why a piece is off) ──
export function Bubble({ text, pose = 'point', tone = 'surface', size = 84 }: { text: string; pose?: Pose; tone?: 'surface' | 'error' | 'success' | 'butter'; size?: number }) {
  const { c, e1, reduceMotion } = useTheme();
  const bg = tone === 'surface' ? c.surface : tone === 'error' ? c.errorTint : tone === 'success' ? c.mintTint : c.sun;
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
      <Mascot pose={pose} size={size} />
      <Animated.View key={text} entering={reduceMotion ? FadeIn.duration(120) : FadeInDown.duration(motion.sheet).springify().damping(18)} accessibilityLiveRegion="polite" style={[{ flex: 1, backgroundColor: bg, borderRadius: radius.lg, borderBottomLeftRadius: 8, paddingVertical: 14, paddingHorizontal: 18, marginBottom: size * 0.28, borderWidth: tone === 'surface' ? 1 : 0, borderColor: c.line }, tone === 'surface' ? e1 : null]}>
        <Txt v="bodyS">{text}</Txt>
      </Animated.View>
    </View>
  );
}

/** A one-line strip for feedback that is part of the lesson. Icon first, few words. */
export function Note({ text, tone = 'default', icon: Icon }: { text: string; tone?: 'default' | 'warn' | 'success' | 'error'; icon?: LucideIcon }) {
  const { c } = useTheme();
  const bg = { default: c.lavender, warn: c.sun, success: c.mintTint, error: c.errorTint }[tone];
  const dot = { default: c.indigo, warn: c.warn, success: c.success, error: c.error }[tone];
  return (
    <Animated.View key={text} entering={FadeIn.duration(180)} accessibilityLiveRegion="polite" style={{ backgroundColor: bg, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      {Icon ? <Icon size={18} color={dot} strokeWidth={2.5} style={{ marginTop: 2 }} /> : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot, marginTop: 8 }} />}
      <Txt v="bodyS" style={{ flex: 1 }}>
        {text}
      </Txt>
    </Animated.View>
  );
}

// ── Sheet ─────────────────────────────────────────────────────────────────
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const { c, e2, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={{ flex: 1, backgroundColor: c.scrim }} onPress={onClose} accessibilityLabel="Close" />
        <Animated.View entering={reduceMotion ? FadeIn.duration(120) : FadeInDown.duration(motion.sheet).springify().damping(20)} style={[{ backgroundColor: c.canvas, borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) + 8, gap: 14, maxHeight: '88%', width: '100%', maxWidth: 520, alignSelf: 'center' }, e2]}>
          <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: c.line, alignSelf: 'center' }} />
          {title && (
            <OnBlock.Provider value={false}>
              <Txt v="title" accessibilityRole="header">
                {title}
              </Txt>
            </OnBlock.Provider>
          )}
          <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 4 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <OnBlock.Provider value={false}>{children}</OnBlock.Provider>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────
type ToastMsg = { text: string; icon?: LucideIcon; action?: { label: string; icon?: LucideIcon; onPress: () => void }; tone?: 'default' | 'success' };
const ToastCtx = createContext<(m: ToastMsg) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastHost({ children }: { children: ReactNode }) {
  const { c, e2, font } = useTheme();
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState<(ToastMsg & { id: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: ToastMsg) => {
    if (timer.current) clearTimeout(timer.current);
    setMsg({ ...m, id: Date.now() });
    timer.current = setTimeout(() => setMsg(null), m.action ? 6000 : 2800);
  }, []);
  const Icon = msg?.icon ?? (msg?.tone === 'success' ? Check : undefined);
  const AIcon = msg?.action?.icon;
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && (
        <Animated.View key={msg.id} entering={FadeInDown.duration(220)} exiting={FadeOut.duration(160)} pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 108, alignItems: 'center', paddingHorizontal: GUTTER }}>
          <View accessibilityLiveRegion="polite" style={[{ backgroundColor: c.ink, borderRadius: radius.pill, paddingVertical: 10, paddingLeft: 18, paddingRight: msg.action ? 8 : 18, flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: 440, minHeight: 52 }, e2]}>
            {Icon && <Icon size={18} color={c.onInk} strokeWidth={3} />}
            <Text maxFontSizeMultiplier={1.3} style={{ color: c.onInk, fontSize: 15, flexShrink: 1, fontFamily: font('m') }}>{msg.text}</Text>
            {msg.action && (
              <Pressable
                onPress={() => {
                  msg.action!.onPress();
                  setMsg(null);
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={msg.action.label}
                style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#F7953A', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {AIcon ? <AIcon size={16} color="#0E0E13" strokeWidth={2.8} /> : <Text maxFontSizeMultiplier={1.3} style={{ color: '#0E0E13', fontSize: 14, fontFamily: font('s') }}>{msg.action.label}</Text>}
              </Pressable>
            )}
          </View>
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
}

/** Staggered rise for lists and cards. */
export function Rise({ children, i = 0, style }: { children: ReactNode; i?: number; style?: StyleProp<ViewStyle> }) {
  const { reduceMotion } = useTheme();
  return (
    <Animated.View entering={reduceMotion ? FadeIn.duration(120) : FadeInDown.duration(motion.screen).delay(Math.min(i, 8) * 50)} style={style}>
      {children}
    </Animated.View>
  );
}
