import { createMessageId } from "./formatjs-id.mjs";

const sortEntries = (entries) =>
  entries.sort(([idA], [idB]) => idA.localeCompare(idB));

export function format(messages) {
  const nextEntries = Object.values(messages).map((descriptor) => {
    const defaultMessage = descriptor.defaultMessage ?? "";
    const nextId = createMessageId(defaultMessage);
    return [
      nextId,
      {
        defaultMessage,
        description: descriptor.description,
      },
    ];
  });

  const sorted = sortEntries(nextEntries);

  return sorted.reduce((acc, [id, descriptor]) => {
    const value = descriptor.defaultMessage ?? "";

    if (Object.prototype.hasOwnProperty.call(acc, id) && acc[id] !== value) {
      throw new Error(
        `[formatjs] ID collision detected for "${id}". Use a unique defaultMessage.`,
      );
    }

    acc[id] = value;
    return acc;
  }, {});
}
