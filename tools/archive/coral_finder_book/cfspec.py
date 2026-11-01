R=lambda a,b: list(range(a,b+1))
# (page, panel): [(genus, photo indices)]; overrides the default (map genus, photos above the 2nd label bar)
O = {
('p010',1):[('Stylophora','all')],
('p011',0):[('Pocillopora','not',[9,10])],
('p015',0):[('Tubastraea',[0,1,2,4])],
('p017',0):[('Pectinia',R(0,3)),('Merulina',[4,5])],
('p019',1):[('Lobophyllia','all')],
('p023',0):[('Platygyra',[1,2,4])],
('p023',1):[('Platygyra','all')],
('p024',0):[('Lobophyllia',R(0,3))],
('p025',0):[('Lobophyllia',[1])],
('p030',0):[],
('p032',0):[('Dipsastraea','not',[12])],
('p033',0):[('Favites',[3,4,6,7])],
('p035',0):[('Pavona','not',[0])],
('p036',0):[('Porites','not',[0])],
('p037',2):[('Goniastrea','all')],
('p043',0):[('Favites',[0,1])],
('p045',0):[('Favites','not',[0])],
('p047',0):[('Porites',R(1,7)),('Galaxea',R(8,16))],
('p048',0):[('Montipora',R(0,8)),('Porites',R(9,11)),('Hydnophora',R(12,16))],
('p050',0):[('Porites',R(0,2)),('Cyphastrea',R(3,8)),('Turbinaria',R(12,17))],
('p051',0):[('Astreopora',[0,1]),('Echinopora',R(5,10))],
('p053',0):[('Acropora',R(0,7)),('Porites',R(8,16))],
('p054',0):[('Montipora','not',[14])],
('p055',0):[('Astreopora',R(0,8)),('Turbinaria',R(9,13)),('Duncanopsammia',[14])],
('p056',0):[('Merulina',R(0,8)),('Pachyseris',R(9,17))],
('p064',2):[('Lithophyllon',[0,1])],
('p066',0):[('Porites',R(0,5)),('Montipora',R(6,10))],
('p067',0):[('Merulina',R(0,4))],
('p067',1):[('Echinopora',R(0,5)),('Goniastrea',R(6,11))],
('p069',0):[('Lobactis',[1,2,3])],
('p070',0):[('Ctenactis',R(0,3))],
('p071',1):[('Halomitra',R(0,5))],
('p076',0):[('Alveopora',[0]+R(2,7)),('Goniopora',R(8,13))],
('p078',0):[('Heliofungia',[0,1,2,4,5])],
('p079',0):[('Plerogyra',[0,1])],
('p080',0):[('Merulina',[0,1,2]),('Galaxea',[3,4])],
}
# Grids the detector left as one block: (page, genus, x, y, w, h, cols, rows)
GRIDS = [
('p025','Lobophyllia',110,905,1615,2357,3,4),
('p030','Cyphastrea',112,337,1617,1414,3,3),
('p069','Lithophyllon',130,321,1610,892,3,2),
]
# Panels with no clean detection, given by hand: (page, genus, [(x,y,w,h)])
MANUAL = [('p032','Diploastrea',[(120,2780,520,480),(640,2780,540,480),(1180,2780,540,480)])]
