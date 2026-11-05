export const spotifySignInScopes = "user-read-email user-read-private playlist-read-private";
export const spotifyListeningScope = "user-read-recently-played";
export const spotifyListeningScopes = `${spotifySignInScopes} ${spotifyListeningScope}`;

export function hasListeningScope(scope: string | null | undefined) {
  return scope?.split(/[\s,]+/).includes(spotifyListeningScope) ?? false;
}
