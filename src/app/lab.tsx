import { Minus, Play, Plus, RotateCcw } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { BuddyHost, Peek, Perch, Reaction, Sidekick, hasBuddyHost, summonRoot } from '@/components/Buddy';
import { Burst, Confetti, CountUp, Float, FogVeil, Pop, Pulse, Rays, Shine, Typer, Wiggle } from '@/components/fx';
import { Mascot, POSES, type Motion, type Pose } from '@/components/Mascot';
import { CLIPS } from '@/components/mascotClips';
import { Badge, Chest, GemPill, GoalRing, GroundShadow, QuestRow, Scene, StreakFlame, UnlockHost, hasUnlockHost } from '@/components/rewards';
import { Block, Btn, Chip, ChipRow, IconBtn, Screen, SectionLabel, Toggle, TopBar, Txt } from '@/components/ui';
import { STRAND_ORDER } from '@/data/profile';
import type { SceneId } from '@/data/story';
import { buddy, useHoldUnlocks, type BuddyEvent } from '@/lib/buddy';
import { BADGES, QUESTS } from '@/lib/rewards';
import { sfx, type SfxName } from '@/lib/sfx';
import { useStore, type Unlock } from '@/lib/store';
import { ON_BLOCK, useTheme } from '@/theme';

// The lab: every piece of the companion, effects and rewards kit, working, with controls.
// Reached from You › Moderator. It is a review and tuning page, not part of the learner's app.

const POSE_LIST = Object.keys(POSES) as Pose[];
const MOTIONS: Motion[] = ['bob', 'hop', 'jump', 'sway', 'shake', 'none'];
const EVENTS: BuddyEvent[] = ['correct', 'wrong', 'combo', 'hint', 'start', 'finish', 'unlock', 'poke'];
const SOUNDS: SfxName[] = ['tap', 'pop', 'good', 'miss', 'combo', 'win', 'unlock', 'gem', 'whoosh', 'chest'];
const SCENE_LIST: SceneId[] = ['garden', 'orchard', 'market', 'woods', 'harbour', 'summit'];
const EVENT_SOUND: Partial<Record<BuddyEvent, SfxName>> = {
  correct: 'good',
  wrong: 'miss',
  combo: 'combo',
  finish: 'win',
  unlock: 'unlock',
};

/** A plain card with visible overflow, so companions can stick out of it. */
function Card({ children, height = 120 }: { children?: ReactNode; height?: number }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        height,
        borderRadius: 28,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.line,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </View>
  );
}

/** Remounts its children when Replay is pressed, to watch an entrance again. */
function Replay({ children, label }: { children: (run: number) => ReactNode; label: string }) {
  const [run, setRun] = useState(1);
  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Txt v="heading">{label}</Txt>
        <IconBtn icon={RotateCcw} label={`Replay ${label}`} size={44} kind="soft" onPress={() => setRun((r) => r + 1)} />
      </View>
      <View key={run}>{children(run)}</View>
    </View>
  );
}

export default function Lab() {
  const { c } = useTheme();
  const display = useStore((s) => s.display);
  const setDisplay = useStore((s) => s.setDisplay);
  const bump = useStore((s) => s.bump);
  const storeGems = useStore((s) => s.gems);

  const [motion, setMotion] = useState<Motion>('hop');
  const [motionPose, setMotionPose] = useState<Pose>('thumbs');
  const [clipSize, setClipSize] = useState(104);
  const [clipStill, setClipStill] = useState(false);
  const [onceRun, setOnceRun] = useState(0);
  const [wiggle, setWiggle] = useState(0);
  const [pulse, setPulse] = useState(true);
  const [chest, setChest] = useState(false);
  const [gems, setGems] = useState(120);
  const [goal, setGoal] = useState(1);
  const [flame, setFlame] = useState(6);
  const [lit, setLit] = useState(true);
  const [scene, setScene] = useState<SceneId>('garden');
  const [fog, setFog] = useState(1);
  const [hold, setHold] = useState(false);
  useHoldUnlocks(hold);
  // The root layout normally hosts the ambient visits; if it does not yet, the lab hosts its own so they can be reviewed.
  const [ownHost] = useState(() => !hasBuddyHost());
  const [ownUnlocks] = useState(() => !hasUnlockHost());

  const push = (u: Unlock) => useStore.setState((s) => ({ unlocks: [...s.unlocks, u] }));
  const fire = (e: BuddyEvent) => {
    buddy.react(e);
    const sound = EVENT_SOUND[e];
    if (sound) sfx.play(sound);
  };

  const page = (
    <Screen top={<TopBar />} gap={22}>
      <Txt v="display">Lab</Txt>

      <SectionLabel>Feel</SectionLabel>
      <ChipRow>
        {(['lively', 'calm', 'off'] as const).map((m) => (
          <Chip key={m} label={m} selected={(display.companion ?? 'lively') === m} onPress={() => setDisplay({ companion: m })} />
        ))}
      </ChipRow>
      <Toggle label="Sound" value={display.sound !== false} onChange={(v) => setDisplay({ sound: v })} />
      <Toggle label="Reduce motion" value={display.reduceMotion} onChange={(v) => setDisplay({ reduceMotion: v })} />
      <Btn small kind="soft" icon={Play} label="Summon Root" a11y="Make Root look in from the edge of the screen" onPress={summonRoot} />

      {/* ── Clips ── */}
      <SectionLabel>{`${POSE_LIST.length} animated clips · tap to poke`}</SectionLabel>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <IconBtn icon={Minus} label="Smaller" size={44} onPress={() => setClipSize((v) => Math.max(56, v - 16))} />
        <Txt v="label" color="ink2">{`${clipSize} pt`}</Txt>
        <IconBtn icon={Plus} label="Bigger" size={44} onPress={() => setClipSize((v) => Math.min(200, v + 16))} />
        <View style={{ flex: 1 }} />
        <Toggle value={clipStill} onChange={setClipStill} label="Still" />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {POSE_LIST.map((p) => (
          <View key={p} style={{ width: Math.max(96, clipSize * 0.95), height: clipSize * 1.45 + 26, alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
            <Mascot key={`${p}${onceRun}`} pose={p} size={p === 'peek' ? clipSize * 0.7 : clipSize} still={clipStill} poke />
            <Txt v="caption" color="ink2">
              {CLIPS[p].loop ? p : `${p} · once`}
            </Txt>
          </View>
        ))}
      </View>
      <Btn kind="soft" small icon={RotateCcw} label="Replay once clips" onPress={() => setOnceRun((v) => v + 1)} />

      <SectionLabel>Facing left</SectionLabel>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 150 }}>
        <Mascot pose="walk" size={120} />
        <Mascot pose="walk" size={120} flip />
        <Mascot pose="run" size={120} flip />
      </View>

      <SectionLabel>Motion accents</SectionLabel>
      <ChipRow>
        {MOTIONS.map((m) => (
          <Chip key={m} label={m} selected={motion === m} onPress={() => setMotion(m)} />
        ))}
      </ChipRow>
      <ChipRow>
        {(['thumbs', 'proud', 'oops', 'think', 'wave'] as Pose[]).map((p) => (
          <Chip key={p} label={p} selected={motionPose === p} onPress={() => setMotionPose(p)} />
        ))}
      </ChipRow>
      <View
        style={{
          height: 190,
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <Mascot key={`${motion}${motionPose}`} pose={motionPose} size={150} motion={motion} />
        <GroundShadow width={130} />
      </View>

      {/* ── Peek ── */}
      <SectionLabel>Peek · top</SectionLabel>
      <View style={{ marginTop: 96 }}>
        <Card>
          <Txt v="bodyS" color="ink2">
            start · center · end
          </Txt>
        </Card>
        <Peek from="top" align="start" size={84} delay={300} />
        <Peek from="top" align="center" pose="search" size={110} delay={900} />
        <Peek from="top" align="end" size={100} delay={1500} />
      </View>

      <SectionLabel>Peek · bottom</SectionLabel>
      <View style={{ marginBottom: 124 }}>
        <Card height={90} />
        <Peek from="bottom" align="start" size={110} delay={300} />
        <Peek from="bottom" align="end" pose="wink" size={110} delay={900} />
      </View>

      <SectionLabel>Peek · sides</SectionLabel>
      <View style={{ marginHorizontal: 78 }}>
        <Card height={150} />
        <Peek from="left" align="end" inset={8} size={110} delay={300} />
        <Peek from="right" align="end" inset={8} pose="listen" size={110} delay={900} />
      </View>

      <SectionLabel>Peek · stays 3 s, then leaves</SectionLabel>
      <Replay label="Short visit">
        {() => (
          <View style={{ marginTop: 84 }}>
            <Card height={80} />
            <Peek from="top" align="center" size={84} delay={400} stay={3000} />
          </View>
        )}
      </Replay>

      {/* ── Perch ── */}
      <SectionLabel>Perch</SectionLabel>
      <Replay label="Sit and stand">
        {() => (
          <View style={{ marginTop: 92 }}>
            <Block tone="brand" style={{ height: 120 }} />
            <Perch side="right" size={96} />
            <Perch side="left" pose="read" size={88} delay={700} />
            <View
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                alignItems: 'center',
              }}
            >
              <View style={{ width: 0, height: 0 }}>
                <Perch pose="wave" side="left" inset={-36} size={92} delay={1100} />
              </View>
            </View>
          </View>
        )}
      </Replay>

      {/* ── Sidekick ── */}
      <SectionLabel>Sidekick · reacts to buddy events</SectionLabel>
      <View
        style={{
          height: 250,
          borderRadius: 28,
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.line,
          padding: 16,
          overflow: 'hidden',
        }}
      >
        <ChipRow>
          {EVENTS.map((e) => (
            <Chip key={e} label={e} onPress={() => fire(e)} />
          ))}
        </ChipRow>
        <Sidekick />
        <Sidekick side="left" size={90} quiet />
      </View>

      <SectionLabel>Reaction</SectionLabel>
      <Replay label="Pop in">
        {() => (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              alignItems: 'flex-end',
              height: 170,
            }}
          >
            <Reaction pose="cheer" size={130} />
            <Reaction pose="dance" size={130} delay={200} />
            <Reaction pose="oops" size={130} delay={400} />
          </View>
        )}
      </Replay>

      {/* ── Effects ── */}
      <SectionLabel>Effects</SectionLabel>
      <Replay label="Pop · Burst · CountUp">
        {() => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-around',
              height: 130,
            }}
          >
            <Pop delay={100}>
              <View
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 42,
                  backgroundColor: c.orange,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Burst size={170} delay={250} />
                <Txt v="heading" style={{ color: ON_BLOCK.ink }}>
                  Pop
                </Txt>
              </View>
            </Pop>
            <CountUp to={250} prefix="+" delay={300} />
          </View>
        )}
      </Replay>
      <Replay label="Confetti">
        {() => (
          <View style={{ height: 200 }}>
            <Confetti height={260} />
          </View>
        )}
      </Replay>
      <Replay label="Typer">{() => <Typer text="A fog rolled in. We call it the Hush. Now words slip away just as you reach for them." />}</Replay>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <Float>
          <View
            style={{
              width: 70,
              height: 70,
              borderRadius: 22,
              backgroundColor: c.mint,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt v="caption" style={{ color: ON_BLOCK.ink }}>
              Float
            </Txt>
          </View>
        </Float>
        <Wiggle trigger={wiggle}>
          <Chip label="Wiggle" onPress={() => setWiggle((w) => w + 1)} />
        </Wiggle>
        <Pulse on={pulse}>
          <Chip label={pulse ? 'Pulse on' : 'Pulse off'} selected={pulse} onPress={() => setPulse((p) => !p)} />
        </Pulse>
      </View>
      <Block tone="orange" style={{ height: 110, justifyContent: 'center' }}>
        <Txt v="heading">Shine</Txt>
        <Shine />
      </Block>
      <Block tone="butter" style={{ height: 240, alignItems: 'center', justifyContent: 'center' }}>
        <Rays size={420} />
        <Badge id="rooted" tier={3} size={110} />
      </Block>

      <SectionLabel>Sounds</SectionLabel>
      <ChipRow>
        {SOUNDS.map((n) => (
          <Chip key={n} label={n} onPress={() => sfx.play(n)} />
        ))}
      </ChipRow>

      {/* ── Rewards ── */}
      <SectionLabel>Badge · every tier</SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Badge id="streak" tier={0} locked />
        {[1, 2, 3, 4, 5, 6].map((t) => (
          <Badge key={t} id="streak" tier={t} />
        ))}
      </View>
      <SectionLabel>Badge · the set</SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {BADGES.map((b) => (
          <View key={b.id} style={{ width: 96, alignItems: 'center', gap: 6 }}>
            <Badge id={b.id} tier={b.tiers.length} size={84} />
            <Txt v="caption" color="ink2" center numberOfLines={1}>
              {b.name}
            </Txt>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
        <Badge id="finder" tier={2} size={56} />
        <Badge id="finder" tier={2} size={84} />
        <Badge id="finder" tier={2} size={120} />
      </View>

      <SectionLabel>Unlock celebrations</SectionLabel>
      <ChipRow>
        <Chip label="Badge" onPress={() => push({ kind: 'badge', id: BADGES[0].id, tier: 2 })} />
        <Chip label="Chapter" onPress={() => push({ kind: 'chapter', n: 1 })} />
        <Chip label="Streak" onPress={() => push({ kind: 'streak', n: 7 })} />
        <Chip label="Level" onPress={() => push({ kind: 'level', strand: STRAND_ORDER[1], level: 3 })} />
        <Chip
          label="All four"
          onPress={() =>
            useStore.setState((s) => ({
              unlocks: [...s.unlocks, { kind: 'badge', id: 'speller', tier: 1 }, { kind: 'chapter', n: 2 }, { kind: 'streak', n: 14 }, { kind: 'level', strand: 'spell', level: 4 }],
            }))
          }
        />
      </ChipRow>
      <Toggle label="Hold celebrations" value={hold} onChange={setHold} />

      <SectionLabel>Chest</SectionLabel>
      <View style={{ alignItems: 'center', gap: 12 }}>
        <Chest open={chest} onPress={() => setChest(true)} />
        <Btn small kind="soft" icon={RotateCcw} label="Close" onPress={() => setChest(false)} />
      </View>

      <SectionLabel>Gems · goal · streak</SectionLabel>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <GemPill value={gems} />
        <IconBtn icon={Plus} label="Add 25 gems" size={44} kind="soft" onPress={() => setGems((g) => g + 25)} />
        <GemPill value={storeGems} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <GoalRing done={goal} goal={3} />
        <IconBtn icon={Minus} label="One less stop" size={44} kind="soft" onPress={() => setGoal((g) => Math.max(0, g - 1))} />
        <IconBtn icon={Plus} label="One more stop" size={44} kind="soft" onPress={() => setGoal((g) => Math.min(3, g + 1))} />
        <Block tone="brand" pad={12} round={24}>
          <GoalRing done={goal} goal={3} size={56} />
        </Block>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <StreakFlame n={flame} lit={lit} />
        <StreakFlame n={flame} lit={lit} size={110} />
        <IconBtn icon={Plus} label="One more day" size={44} kind="soft" onPress={() => setFlame((f) => f + 1)} />
        <Chip label={lit ? 'Lit' : 'Unlit'} selected={lit} onPress={() => setLit((l) => !l)} />
      </View>

      <SectionLabel>Quests</SectionLabel>
      <Block>
        <View style={{ gap: 14 }}>
          {QUESTS.slice(0, 4).map((q) => (
            <View key={q.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <QuestRow id={q.id} />
              </View>
              <IconBtn icon={Play} label={`Add progress to ${q.label}`} size={40} kind="soft" onPress={() => bump(q.counter)} />
            </View>
          ))}
        </View>
      </Block>

      <SectionLabel>Scene and the Hush</SectionLabel>
      <ChipRow>
        {SCENE_LIST.map((s) => (
          <Chip key={s} label={s} selected={scene === s} onPress={() => setScene(s)} />
        ))}
      </ChipRow>
      <ChipRow>
        {[0, 0.35, 0.7, 1].map((f) => (
          <Chip key={f} label={f === 0 ? 'Clear' : f === 1 ? 'Full fog' : `${Math.round(f * 100)}%`} selected={fog === f} onPress={() => setFog(f)} />
        ))}
      </ChipRow>
      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
        <Scene scene={scene} size={250} fog={fog} />
      </View>
      <Block tone="lilac" style={{ alignItems: 'center' }}>
        <Scene scene={scene} size={170} fog={fog} fogColor={c.lilac} />
      </Block>
      <View
        style={{
          height: 120,
          borderRadius: 28,
          backgroundColor: c.ink,
          overflow: 'hidden',
        }}
      >
        <FogVeil amount={fog} />
      </View>
    </Screen>
  );
  return (
    <>
      {ownHost ? <BuddyHost>{page}</BuddyHost> : page}
      {ownUnlocks && <UnlockHost />}
    </>
  );
}
