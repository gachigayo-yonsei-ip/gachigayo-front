// src/components/BottomSheet.jsx
import { BottomSheet } from 'react-spring-bottom-sheet'
import 'react-spring-bottom-sheet/dist/style.css'
import './BottomSheet.css' // 스타일 커스터마이징

export default function CustomBottomSheet({ children }) {
  return (
    <BottomSheet
      open={true}
      snapPoints={({ minHeight, maxHeight }) => [200, 500]}
      defaultSnap={({ snapPoints }) => snapPoints[0]}
      blocking={false}
      expandOnContentDrag
    >
      <div className="handlebar" />
      {children}
    </BottomSheet>
  )
}
