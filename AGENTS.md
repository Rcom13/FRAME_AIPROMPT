# FRAME project workflow

## Constructive milestones

A constructive milestone is a completed, independently useful feature or fix that has passed the relevant build or validation. At every constructive milestone:

1. Keep generated deployment archives and staging folders out of source control.
2. Run the relevant validation, normally `npm run build`.
3. Create one intentional commit describing the milestone.
4. Push the exact commit to the Sites source remote and to the GitHub mirror at `Rcom13/FRAME_AIPROMPT`.
5. Publish the Sites version when the milestone changes the deployed product.

Do not push broken, secret-bearing, or partially implemented states. Never commit API keys or `.env` files.
