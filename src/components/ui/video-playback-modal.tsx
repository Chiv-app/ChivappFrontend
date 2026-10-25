"use client";

import { ModalCloseButton } from "@/components/ui/modal-close-button";
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalHeader,
} from "@heroui/react";
import { getVideoAutoplayEmbedUrl, getVideoPlatformLabel } from "@/lib/video-urls";

type Props = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    url: string | null;
    title?: string;
};

export default function VideoPlaybackModal({
    isOpen,
    onOpenChange,
    url,
    title,
}: Props) {
    const playbackUrl = url ? getVideoAutoplayEmbedUrl(url) : null;
    const platform = url ? getVideoPlatformLabel(url) : "Video";
    const heading = title ? `${platform} · ${title}` : platform;

    return (
        <Modal closeButton={<ModalCloseButton aria-label="Cerrar" />}
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            size="3xl"
            backdrop="blur"
            placement="center"
            scrollBehavior="inside"
            classNames={{
                base: "bg-content1",
                body: "p-0 overflow-hidden",
            }}
        >
            <ModalContent>
                {() => (
                    <>
                        <ModalHeader className="border-b border-default-200/70">
                            {heading}
                        </ModalHeader>
                        <ModalBody>
                            <div className="aspect-video w-full bg-black">
                                {isOpen && playbackUrl ? (
                                    <iframe
                                        key={url ?? "video"}
                                        src={playbackUrl}
                                        title={heading}
                                        className="size-full"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        referrerPolicy="strict-origin-when-cross-origin"
                                        allowFullScreen
                                    />
                                ) : null}
                            </div>
                        </ModalBody>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
