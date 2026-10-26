/*
 * ─── Why do we use both `type` and `interface`? ──────────────────────────
 *
 *  • `interface` → for OBJECT SHAPES: things with named properties, like a
 *    JournalEntry. An interface reads as "every object of this kind must look
 *    like this", it can be extended with `extends`, and errors are clear.
 *
 *  • `type`      → for things an interface CANNOT describe: unions of literal
 *    values ('happy' | 'sad'), aliases that give a primitive a meaningful name,
 *    and types built from other types with utility types (Omit, Partial).
 *
 * ─────────────────────────────────────────────────────────────────────────
 */
// `enum`: a named set of constants. A mood can only be one of these 5 members,
// so a typo like Mood.HAPY is a compile error instead of a hidden bug.
// String values keep localStorage readable ("happy", not 0).
export var Mood;
(function (Mood) {
    Mood["HAPPY"] = "happy";
    Mood["SAD"] = "sad";
    Mood["MOTIVATED"] = "motivated";
    Mood["STRESSED"] = "stressed";
    Mood["CALM"] = "calm";
})(Mood || (Mood = {}));
