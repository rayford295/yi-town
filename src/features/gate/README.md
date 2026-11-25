# Gate

The front door, rendered by `main.ts` before any route while `gatePassed()` is false. One
password (strings `gate.*` in i18n), typed into a password field, reduced to its digits and
compared as SHA-256 against the single entry of `ANSWERS` in `src/core/gate.ts`. A pass is stored
in `localStorage` (`yi.gate.2`), so each device is asked once.

Until 1.23 this was a question (the day we met) that also took short spellings of the date. Since
1.24 only the full eight digits open the door, and passes of the old question no longer count.

To change the password: `npm run gate -- "<new password>"`, paste the hash into `ANSWERS`, and
raise the number in `KEY` so every device is asked again. The password itself is not written
anywhere in the repository.

This keeps a passer-by out; it is not access control. The site is static, so its files can be
fetched without passing the gate. See "Later: a Private Version" in `docs/DEPLOY.md`.
