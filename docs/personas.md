# Personas

The MVP is single-device, single-user, so these personas describe **roles a person adopts at
different points**, not separate accounts or permission levels. All are the same login/session
in v1. They're documented anyway because the phase model, the "signed/read-only" state, and the
future multiplayer version all depend on understanding who's *doing what* at each moment — even
when it's the same person wearing different hats (fittingly).

## Facilitator
Runs the session end to end. In the MVP, this is simply "the user" — the one person with a
laptop or standing at the projector, driving the board. Responsibilities that show up in the UI:

- Advances (or deliberately jumps back to) phases
- Types in ideas, enablers/blockers, and scores as the room calls them out verbally
- Time-boxes the Situation phase
- Records the final decision, countermeasure, and dissent
- Signs off (marks the board `signed`)

## Contributor (verbal, in-room)
In the MVP's target scenarios — laptop chat, or projector in a meeting room — contributors are
**not separate system users**; they're people in the room speaking ideas aloud that the
facilitator transcribes. This shapes the MVP significantly: there is no per-user attribution,
no anonymity mechanism, and no simultaneous input. All of that becomes relevant only in the
future multiplayer version (see `mvp-scope.md`), at which point Contributor becomes a real
system role with their own input surface.

## Approver
The named signatory on the Decision column ("Approved By"). In the MVP this is just a text
field the facilitator fills in — there's no authentication tying it to an actual account, and
no request/approval workflow. Worth keeping in mind for later: if this tool is ever used
somewhere the sign-off needs to be a real accountability record (e.g. a quality/compliance
context, per the worked example's pharma flavour), "Approved By" as a free-text field is not
sufficient — but that's explicitly out of scope for MVP.

## Viewer (post-hoc)
Someone who opens a **signed** board later, read-only, to see what was decided and why. This is
the audience for the exported PNG as much as for the in-app read-only view. No special
persona-specific UI is needed beyond "signed boards render fully disabled, with no phase
navigation to jump to since there's nothing left to do."
