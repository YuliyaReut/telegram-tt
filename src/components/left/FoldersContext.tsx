import useContext from "../../hooks/data/useContext";
import React, { createContext, TeactNode, useState } from "../../lib/teact/teact";
import { TabWithProperties } from "../ui/TabList";

interface FoldersContextType {
  addFolder: (folder: TabWithProperties) => void;
  getAllFolders: () => TabWithProperties[];
}

const FoldersContext = createContext<FoldersContextType | null>(null);

export const FoldersProvider = ({ children }: { children: TeactNode }) => {
  const [folderMap, setFolderMap] = useState<Map<number, TabWithProperties>>(new Map());

  const addFolder = (folder: TabWithProperties) => {
    setFolderMap((prev) => {
      const newMap = new Map(prev);
      newMap.set(folder.id!, folder);
      return newMap;
    });
  };

  const getAllFolders = () => Array.from(folderMap.values());

  return (
    <FoldersContext.Provider value={{ addFolder, getAllFolders }}>
      {children}
    </FoldersContext.Provider>
  );
};

export const useFoldersContext = (): FoldersContextType => {
  return  useContext(FoldersContext) as FoldersContextType;
};
