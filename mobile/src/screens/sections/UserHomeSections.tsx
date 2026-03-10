import { Text } from 'react-native';
import { TabHeaderCard } from '../../components/TabHeaderCard';

type ScreenStyles = Record<string, any>;

type UserHomeHeaderSectionProps = {
  styles: ScreenStyles;
  badge: string;
  title: string;
  description: string;
  loginId: string;
  rolesLabel: string;
};

export function UserHomeHeaderSection({
  styles,
  badge,
  title,
  description,
  loginId,
  rolesLabel,
}: UserHomeHeaderSectionProps) {
  return (
    <TabHeaderCard
      badge={badge}
      title={title}
      description={description}
      meta={(
        <>
          <Text style={styles.caption}>로그인 ID: {loginId}</Text>
          <Text style={styles.caption}>권한: {rolesLabel}</Text>
        </>
      )}
    />
  );
}
