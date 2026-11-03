// The corals as the current subject, for tests that run app files on stubs (app.js SUBJ, sKey, sDev, inSubject,
// SUBJ_VISIT; core.js SUBJECTS, subjKey, subjDev): the engine's keys are then the corals' own, as before subjects.
const C = require('../core.js');
module.exports = () => {
  const SUBJ = C.subjectOf('coral');
  return {
    SUBJ,
    SUBJECTS: C.SUBJECTS,
    subjKey: C.subjKey,
    subjDev: C.subjDev,
    sKey: name => C.subjKey(SUBJ.id, name),
    sDev: name => C.subjDev(SUBJ.id, name),
    // Only the corals here: a visit to another subject does nothing (these tests run the corals' code only).
    inSubject: (id, fn) => (id === SUBJ.id ? fn() : undefined),
    SUBJ_VISIT: 0
  };
};
