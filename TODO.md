# TODO & Known Issues

## The health endpoint is taking 1 min 30 seconds to respond for a completely new instance.

## Could there be a faster way to compile and show the tex? (Probably not since overleaf also gives the same issue)

## Yet to implement phase 4.

## Need to iron out one bug/enhancement with tex input which is that patches are auto-applied, so whatever diff is shown in screen, the LHS always is empty cause the text is already gone, We should ideally give the user control over what should be applied and what shouldn't be, Review surgical patches should show the diff and only when they accept the edit will be made. Same should apply for the chatbot. Currently there's only the "Apply surgical patches" which is fine, But I have no area to review it. We should show that patch also in the review patches screen. To make it intuitive we can instead remove the multiple apply surgical patches buttons in the chatbot area and tell the user we have suggested the changes and maybe highlight the existing review surigcal patches section with a glow or +1 symbol of sorts (We can consider which is more akin to windows XP)

## theres no way to clear and start over. It's a clear cookies that would do it. We just need a Start New session button that clears everything but keeps the API key details. (Would have to confirm again to start a new session)

## AI Critique and AI comment no 1 are the same thing, We should probably remove it. I might have told gemini to do that with the preface that we would interact with it in a non chat manner and it would give comments like a PR reviewer but that's too token intensive and not worth the cost.

## In cases of PDF based responses, we should not be giving AI the prompt to make surgical patches change, it should give the changelog suggestion itself as the output that way the user would know what to modify.

## While I know maintainability is a cat and mouse chase I should atleast deploy it without any deprecated module.

## Final phase should be to iron out all bugs and make it vendor agnostic (For 3 options, Gemini, Claude and OpenAI). User would input a Model (By default we populate some examples for Gemini, Claude and OpenAI but just so user knows, we can give the links for the models list as well for each of them).
