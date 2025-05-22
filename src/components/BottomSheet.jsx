// CustomBottomSheet.jsx
import { BottomSheet } from 'react-spring-bottom-sheet'
import 'react-spring-bottom-sheet/dist/style.css'
import './BottomSheet.css'

export default function CustomBottomSheet({ children }) {
  return (
      <BottomSheet
        open={true}
        snapPoints={({ minHeight, maxHeight }) => [200, 500]}
        defaultSnap={({ snapPoints }) => snapPoints[0]}
        blocking={false}
        expandOnContentDrag
      >
          {children}
      </BottomSheet>
  )
}
