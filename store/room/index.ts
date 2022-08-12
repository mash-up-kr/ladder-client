import produce from "immer";
import type { WritableDraft } from "immer/dist/internal";
import { atom, selector, useRecoilState } from "recoil";
import type { SetterOrUpdater } from "recoil";
import { VIDEO_LIST } from "~/assets/dummy";
import type { Music } from "~/types/musics";

interface RoomState {
  playList: Music[];
  proposedMusicList: Music[];
  playingMusicId: string;
  isPlaying: boolean;
  isHost: boolean;
  mood: string;
}

const roomAtomState = atom<RoomState>({
  key: "room",
  default: {
    // Youtube Player
    isHost: false,
    isPlaying: false,

    // Playlist
    playList: [],
    proposedMusicList: [],

    playingMusicId: "",

    // Mood
    mood: "",
  },
});

export const useRoomStore = () => {
  const [state, setState] = useRecoilState(roomAtomState);
  const actions = createActions(state, setState);

  return { state, actions };
};

function createActions(state: RoomState, setState: SetterOrUpdater<RoomState>) {
  const update = (callback: (draft: WritableDraft<RoomState>) => void) => {
    setState((prev) => produce(prev, callback));
  };

  const getMusicIndex = (id: string) => {
    const index = state.playList.findIndex((item) => item.id === id);

    return index === -1 ? 0 : index;
  };

  return {
    init(musicData: Music[], isHost: boolean, mood: string) {
      update((draft) => {
        draft.playList = musicData;
        draft.proposedMusicList = VIDEO_LIST;
        draft.playingMusicId = musicData[0]?.id || "";
        draft.isHost = isHost;
        draft.mood = mood;
      });
    },

    playNextMusic() {
      if (!state.isHost) {
        return null;
      }

      const playingIndex = getMusicIndex(state.playingMusicId);
      if (playingIndex === state.playList.length - 1) {
        return null;
      }

      update((draft) => {
        draft.playingMusicId = state.playList[playingIndex + 1].id;
      });
    },

    playPrevMusic() {
      if (!state.isHost) {
        return null;
      }
      const playingIndex = getMusicIndex(state.playingMusicId);
      if (playingIndex === 0) {
        return null;
      }
      update((draft) => {
        draft.playingMusicId = state.playList[playingIndex - 1].id;
      });
    },

    setPlayingMusicId(id: string) {
      update((draft) => {
        draft.playingMusicId = id;
      });
    },

    addToPlaylist(music: Music) {
      update((draft) => {
        draft.playList.push(music);
      });
    },

    setPlaylist(list: Music[]) {
      update((draft) => {
        draft.playList = list;
      });
    },

    setIsPlaying(isPlaying: boolean) {
      update((draft) => {
        draft.isPlaying = isPlaying;
      });
    },

    getMusicIndex,

    removeMusicFromProposedList(id: string) {
      update((draft) => {
        draft.proposedMusicList = state.proposedMusicList.filter(
          (item) => item.id !== id
        );
      });
    },

    addMusicToProposedList(music: Music) {
      update((draft) => {
        draft.proposedMusicList.push(music);
      });
    },

    setIsHost(isHost: boolean) {
      update((draft) => {
        draft.isHost = isHost;
      });
    },

    setMood(mood: string) {
      update((draft) => {
        draft.mood = mood;
      });
    },
  };
}
