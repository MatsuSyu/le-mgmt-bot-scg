import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

interface Member {
  id: string;
  name: string;
  role: string;
  categories: string[];
  linked_players?: string[];
  elementary_school?: string;
}

const MemberManager: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "members"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Member[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Member);
      });
      setMembers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>👥 メンバー管理</h3>
        <button className="btn-primary">+ メンバー追加</button>
      </div>

      {loading ? (
        <p>読み込み中...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>氏名</th>
              <th>役割</th>
              <th>カテゴリ</th>
              <th>所属校</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999' }}>登録メンバーがいません</td></tr>
            ) : (
              members.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{m.name}</td>
                  <td>
                    <span className={`badge ${m.role === 'coach' ? 'badge-danger' : m.role === 'parent' ? 'badge-primary' : 'badge-success'}`}>
                      {m.role === 'coach' ? '指導者' : m.role === 'parent' ? '保護者' : '選手'}
                    </span>
                  </td>
                  <td>{m.categories?.join(', ') || '-'}</td>
                  <td>{m.elementary_school || '-'}</td>
                  <td><button style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>詳細</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default MemberManager;
