import React, { useEffect, useState } from "react";
import styled from "@emotion/styled";
import axios from "axios";
import YouTube from "react-youtube";
import { VIDEO_LIST } from "~/assets/dummy";
import {
  BottomButton,
  Spacer,
  TopBar,
  TopBarIconButton,
} from "~/components/uis";
import Modal, { useModal } from "~/components/uis/Modal";
import { useRoomStore } from "~/store";
import { getDurationText } from "~/store/room/utils";
import type { Music } from "~/types/musics";
import AddSongGuideScreen from "../AddSongGuideScreen";

const defaultEndPoint = process.env
  .NEXT_PUBLIC_SERVER_DEFAULT_END_POINT as string;

interface AddSongScreenProps {
  onClickBackButton: () => void;
}

/**
   1. 복붙한 링크가 유튜브링크가 맞는지 체크
     1-1. 유튜브 링크가 맞을경우, id값을 뽑아낸다
     1-2. 유튜브 링크가 아닐경우, 에러메세지 + 빈값
  
   2. 아이디를 유튜브 영상 컴포넌트로 전달한다
     2-1. 하단 버튼 활성화
     2-2. 유효한 아이디 아닐경우 에러 처리
  */

function AddSongScreen({ onClickBackButton }: AddSongScreenProps) {
  const {
    state: { playList, proposedMusicList, isHost },
    actions,
  } = useRoomStore();

  const { close } = useModal();
  const [youtubeLink, setYoutubeLink] = useState("");
  const [youtubeId, setYoutubeId] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setIsValid(false);
    if (!youtubeLink) {
      return setYoutubeId("");
    }

    const id = parseYoutubeIdFromLink(youtubeLink);
    setYoutubeId(id);
  }, [youtubeLink]);

  const handleSubmit = async () => {
    try {
      const res = await axios.get(
        `${defaultEndPoint}/search/v1/youtube/video?videoId=${youtubeId}`
      );

      const thumbnailRes = await axios.get("/api/thumbnail", {
        params: {
          url: res.data.snippet.thumbnails.high.url,
        },
      });

      // const socketData = {
      //   videoId: res.data.id,
      //   title: res.data.snippet.title,
      //   duration: res.data.contentDetails.duration,
      //   thumbnail: res.data.snippet.thumbnails.high.url,
      //   channelName: "",
      //   color,
      // };

      const musicData: Music = {
        id: res.data.id,
        title: res.data.snippet.title,
        duration: res.data.contentDetails.duration,
        thumbnail: res.data.snippet.thumbnails.high.url,
        colors: thumbnailRes.data.colors,
      };

      if (isHost) {
        actions.addToPlaylist(musicData);
      } else {
        actions.addMusicToProposedList(musicData);
      }

      close();

      // TODO(@Young-mason): 웹소켓 요청보내기
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <S.Container>
      <TopBar
        leftIconButton={
          <TopBarIconButton iconName="arrow-left" onClick={onClickBackButton} />
        }
        rightIconButton={<QuestionButton />}
      />
      {/* <button onClick={props.onClickBackButton}>뒤로가기</button> */}
      <S.HeadingText>
        {`추가하고 싶은 곡의\n링크를 입력해주세요!`}
      </S.HeadingText>

      <S.Input
        placeholder="링크 입력해주세요"
        value={youtubeLink}
        onChange={(e) => setYoutubeLink(e.target.value)}
      />

      {youtubeId && (
        <S.YoutubeWrapper>
          <YouTube
            videoId={youtubeId}
            opts={{
              width: "100%",
              height: 185,
              playerVars: {
                autoplay: 1,
                controls: 0,
                mute: 1,
              },
            }}
            onError={() => {
              console.error("유효하지 않은 ID입니다");
              setIsError(true);
            }}
            onReady={(e) => {
              const data = e.target.getVideoData();
              console.log(
                "🚀 ~ file: index.tsx ~ line 124 ~ AddSongScreen ~ data",
                data
              );
              const videoId = e.target.getVideoData().video_id;
              if (videoId) {
                setIsValid(true);
              }
            }}
          />
        </S.YoutubeWrapper>
      )}

      {proposedMusicList.length ? (
        <S.ProposedMusicListCard hidden={!isHost}>
          <S.CardHeader>
            <strong>{proposedMusicList.length}건</strong>의 신청된 노래가 있어요
          </S.CardHeader>
          <S.CardContent>
            {proposedMusicList.map((item) => (
              <S.CardItem key={item.id}>
                <Spacer type="vertical">
                  <S.MusicTitle>{item.title}</S.MusicTitle>
                  <S.MusicArtist>
                    {getDurationText(item.duration || 0)}
                  </S.MusicArtist>
                </Spacer>
                <Spacer gap={8}>
                  <S.Button
                    color="#007aff"
                    onClick={() => {
                      actions.addToPlaylist(item);
                      actions.removeMusicFromProposedList(item.id);
                      // close();
                    }}
                  >
                    추가
                  </S.Button>
                  <S.Button
                    color=" #F54031"
                    onClick={() => {
                      actions.removeMusicFromProposedList(item.id);
                    }}
                  >
                    거절
                  </S.Button>
                </Spacer>
              </S.CardItem>
            ))}
          </S.CardContent>
        </S.ProposedMusicListCard>
      ) : (
        <></>
      )}

      <BottomButton
        label={isHost ? "곡 추가하기" : "곡 신청하기"}
        onClick={handleSubmit}
        disabled={!isValid}
      />
    </S.Container>
  );
}
const QuestionButton = () => (
  <Modal
    trigger={({ open }) => (
      <TopBarIconButton iconName="circle-question" onClick={open} />
    )}
    modal={({ close }) => <AddSongGuideScreen onClickBackButton={close} />}
  />
);

const DOMAINS = ["www.youtube.com", "youtu.be"];

function parseYoutubeIdFromLink(link: string) {
  try {
    const { hostname, pathname, search } = new URL(link);
    const isValid = DOMAINS.some((domain) => hostname === domain);

    if (!isValid) {
      throw new Error();
    }

    if (pathname === "/watch") {
      return search.split("?v=")[1];
    }

    return pathname.slice(1);
  } catch (error) {
    console.error("유효하지 않은 유튜브 링크입니다");

    return "";
  }
}

const S = {
  Container: styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;

    background-color: rgba(0, 0, 0, 0.85);
    padding: 0 20px;
    z-index: 1;
    overflow-y: auto;
  `,

  HeadingText: styled.h3`
    font-weight: 600;
    font-size: 24px;
    line-height: 145%;
    letter-spacing: -0.253163px;
    color: #ffffff;

    margin: 20px 0 0;
    white-space: pre-wrap;
  `,

  Input: styled.input`
    margin-top: 24px;
    width: 100%;
    height: 49px;
    border-radius: 8px;
    padding: 0 24px;
    border: none;
    z-index: 2;
    :focus {
      outline: 0;
    }
  `,

  YoutubeWrapper: styled.div`
    margin-top: 20px;
    position: relative;
    aspect-ratio: 16 / 9;
    background-color: black;
    iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      clip-path: inset(0% 0% 0% 0% round 8px);
    }
  `,

  ProposedMusicListCard: styled.div<{ hidden: boolean }>`
    display: ${(p) => (p.hidden ? "none" : "")};
    margin: 20px 0%;
    background: rgba(26, 26, 26, 0.9);
    border-radius: 20px;
    padding: 20px;
  `,

  CardHeader: styled.div`
    color: white;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 20px;

    font-size: 14px;
    line-height: 17px;
    /* identical to box height */

    letter-spacing: -0.452636px;

    & > strong {
      font-weight: 800;
    }
  `,

  CardContent: styled.ul`
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,
  CardItem: styled.li`
    display: flex;
    justify-content: space-between;
  `,

  MusicTitle: styled.div`
    color: white;
    font-weight: 600;
    font-size: 12px;
    line-height: 155%;
    line-clamp: 2;
    text-overflow: ellipsis;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  `,
  MusicArtist: styled.div`
    font-weight: 300;
    font-size: 12px;
    line-height: 155%;
    letter-spacing: -0.405328px;

    color: #959595;
  `,

  Button: styled.button<{ color: string }>`
    cursor: pointer;
    border: none;
    padding: 9px 16px;
    background: ${(p) => p.color};
    border-radius: 6px;
    font-weight: 600;
    font-size: 12px;
    line-height: 14px;
    letter-spacing: -0.306564px;
    color: #fff;
    white-space: nowrap;
  `,
};

export default AddSongScreen;
