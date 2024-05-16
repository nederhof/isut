for grid in {25..35}
do
	for dim in {35..45}
	do
		echo grid=$grid, dim=$dim
		python3 experiment.py 1 -g $grid -d $dim
	done
done
