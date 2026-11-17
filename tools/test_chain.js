// gears, shutter_lamp and report_form without the server, on made-up values. No game data.
const Mod = require('../engine/modules'), W = require('../engine/world');
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}: ${JSON.stringify(got)}`); };
Mod.setPush(() => {});
const r = { solo: false, messages: [], world: { solved: {}, vars: { lit: 'no' } } };
const FINAL = { var: 'lit', is: 'yes' };
const gears = { type: 'gears', title: 'G', closed: [{ if: FINAL, text: 'locked' }], options: { teeth: [10, 20, 30], sum: 40, start: [20, 20], base: 60, var: 'p', labelA: 'A', labelB: 'B', meshText: 'mesh', tooBigText: 'big', tooSmallText: 'small', button: 'go', message: 'set {a}/{b} {period}' } };
const lamp = { type: 'shutter_lamp', title: 'L', sides: { a: 'crank', b: 'drum' }, options: { start: [true, true, true, false], goal: { runs: [2], period: 20 }, periodVar: 'p', startPeriod: 30, textA: 'a', holdLabel: 'h', textB: 'b', centerLabel: 'c', patterns: { none: 'none', steady: 'steady {open}', single: '{n} flash', uneven: 'uneven {runs}' }, lookText: '{pattern} @ {period}', readyText: 'ready', waitText: 'wait', button: 'fire', message: 'FIRE {code} {shutters} {pattern} {period}', codes: { good: 'OK', firstBad: 'B1', bad: 'B2' } } };
const rep = { type: 'report_form', title: 'R', options: { questions: [{ text: 'q1', choices: ['x', 'y'], answer: 'y' }, { text: 'q2', choices: ['m', 'n'], answer: 'm' }], choose: '-', missingText: 'fill', button: 'sign', message: 'signed {good}/{total} light {light}', okText: 'done {good}', values: { light: [{ if: FINAL, value: 'on' }, { value: 'off' }] } } };
const G = (p, m) => Mod.act(gears, 'gears', r, p, m), L = (p, m) => Mod.act(lamp, 'lamp', r, p, m), R = (p, m) => Mod.act(rep, 'rep', r, p, m);

// gears
check('start pair meshes', Mod.view(gears, 'gears', r, 0).view.mesh, true);
G(0, { axle: 'a', teeth: 30 }); check('too big', Mod.view(gears, 'gears', r, 1).view.status, 'big');
check('install refused when not meshing', G(0, { install: true }).msgs.length, 0);
G(0, { axle: 'a', teeth: 99 }); check('unknown gear refused', Mod.view(gears, 'gears', r, 0).view.a, 30);
G(1, { axle: 'b', teeth: 10 }); const gi = G(1, { install: true });
check('install message', gi.msgs.map(m => [m.text, m.silent]), [['(GAME: set 30/10 20)', false]]);
check('install closes the window, not solved', [gi.view.close, gi.view.solved], [true, false]);
check('period shared', r.modVars.p, 20);

// shutter_lamp
L(0, { side: 'a' }); L(1, { side: 'b' });
const va = Mod.view(lamp, 'lamp', r, 0).view, vb = Mod.view(lamp, 'lamp', r, 1).view;
check('crank side has no shutters', 'shutters' in va, false);
check('goal in no view', JSON.stringify([va, vb]).includes('runs'), false);
check('drum reads period from gears', vb.period, 20);
check('look text', vb.look, '3 flash @ 20');
check('fire refused without crank', L(1, { fire: true }).msgs.length, 0);
L(1, { toggle: 9 }); L(0, { toggle: 0 }); check('bad toggles ignored', Mod.view(lamp, 'lamp', r, 1).view.shutters, [true, true, true, false]);
L(0, { hold: true }); check('crank held: ready', Mod.view(lamp, 'lamp', r, 1).view.ready, true);
const f1 = L(1, { fire: true });
check('first wrong ignition keeps the panel', [f1.msgs[0].text, f1.view.solved, f1.view.close], ['(GAME: FIRE B1 ●●●○ 3 flash 20)', false, true]);
check('firing lets the crank go', Mod.view(lamp, 'lamp', r, 0).view.crank, false);
L(0, { hold: true }); Mod.leaveAll({ panels: { lamp } }, r, 0); check('leaving lets the crank go', Mod.view(lamp, 'lamp', r, 1).view.crank, false);
L(1, { toggle: 2 }); L(0, { hold: true }); const f2 = L(1, { fire: true });
check('right ignition finishes', [f2.msgs[0].text, f2.view.solved], ['(GAME: FIRE OK ●●○○ 2 flash 20)', true]);
L(1, { toggle: 0 }); check('finished lamp takes no moves', [r.mods.lamp.state.shutters[0], Mod.view(lamp, 'lamp', r, 1).view], [true, null]);
{ const r2 = { solo: true, messages: [], world: { solved: {}, vars: {} } }, o = Mod.act(lamp, 'lamp', r2, 0, { fire: true }), o2 = Mod.act(lamp, 'lamp', r2, 0, { fire: true });
  check('alone: no crank needed, second wrong is final', [o.msgs[0].text.includes('B1'), o2.msgs[0].text.includes('B2'), o2.view.solved], [true, true, true]); }

// closed by world condition
r.world.vars.lit = 'yes';
const gc = Mod.view(gears, 'gears', r, 0); check('gears closed by condition', [gc.closed, gc.view], ['locked', null]);
check('closed panel takes no moves', G(0, { axle: 'a', teeth: 10 }).msgs.length + (r.mods.gears.state.a === 30 ? 0 : 1), 0);

// report_form
const vr = Mod.view(rep, 'rep', r, 0).view; check('answers in no view', JSON.stringify(vr).includes('answer'), false);
check('sign needs every pick', [R(0, { sign: true }).view.text, R(0, { sign: true }).msgs.length], ['fill', 0]);
R(0, { pick: 0, value: 'z' }); check('unknown choice refused', r.mods.rep.state.picks, [null, null]);
R(0, { pick: 0, value: 'y' }); R(1, { pick: 1, value: 'n' }); check('both players share picks', Mod.view(rep, 'rep', r, 1).view.picks, ['y', 'n']);
const s = R(1, { sign: true });
check('signing scores and reads the world', [s.msgs[0].text, s.view.solved, s.view.text], ['(GAME: signed 1/2 light on)', true, 'done 1']);
check('signed once', R(0, { pick: 1, value: 'm' }).msgs.length + R(0, { sign: true }).msgs.length, 0);
check('done text stays', Mod.view(rep, 'rep', r, 0).doneText, 'done 1');
check('state is plain JSON', JSON.parse(JSON.stringify(r.mods)).rep.frame.done, true);
console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
