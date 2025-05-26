// CustomBottomSheet.jsx
import { BottomSheet } from 'react-spring-bottom-sheet'
import 'react-spring-bottom-sheet/dist/style.css'
import './BottomSheet.css'

export default function CustomBottomSheet({ children, scrollRef }) {
  return (
    <BottomSheet
      open={true}
      snapPoints={({ maxHeight }) => [0.25 * maxHeight, 0.6 * maxHeight, 0.9 * maxHeight]}
      defaultSnap={({ snapPoints }) => snapPoints[1]}
      blocking={false}
      expandOnContentDrag
      scrollLocking={false}
      scrollRef={scrollRef}
      springConfig={{ damping: 40, stiffness: 150 }}
    >
      {children}
    </BottomSheet>
  )
}
