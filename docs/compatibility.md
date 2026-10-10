# Compatibility

This source preview targets Codex CLI **0.162.0-alpha.17.2**, official commit `740e5af33c71225640e0c1c1555c514c2c93ab74`, and registered Windows Desktop **26.1007.2314.0**. `start.ps1` checks the registered MSIX version and starts Desktop within its package identity. The installed Start-menu app is unchanged.

The matching local native and registered Desktop are running and have completed Luna→capture→Main-send→response chains, including fallback and later same-turn recovery. A cold public-layout Desktop launch was not performed; the portable bundle is verified separately without interrupting current work. Experimental UI features and future Desktop versions are not covered by this acceptance.
